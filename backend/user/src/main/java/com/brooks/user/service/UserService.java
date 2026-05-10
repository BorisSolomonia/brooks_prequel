package com.brooks.user.service;

import com.brooks.common.exception.ResourceNotFoundException;
import com.brooks.user.domain.User;
import com.brooks.user.domain.UserRole;
import com.brooks.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    @Value("${app.admin-emails:}")
    private List<String> adminEmails;

    // Evict the cached lookup on the find-or-create path because the user's role/email may
    // have just changed (admin email syncing, first-time creation).
    @Transactional
    @CacheEvict(value = "usersBySubject", key = "#auth0Subject")
    public User findOrCreateUser(String auth0Subject, String email) {
        return userRepository.findByAuth0Subject(auth0Subject)
                .map(user -> syncAdminRole(user, email))
                .orElseGet(() -> {
                    // The users.email column is UNIQUE NOT NULL, so a blank fallback collides as
                    // soon as a second emailless user signs in. Derive a deterministic per-subject
                    // synthetic so no two emailless users ever share the same slot.
                    String safeEmail = (email == null || email.isBlank())
                            ? auth0Subject.replace("|", "_") + "@noemail.brooks.local"
                            : email;
                    return userRepository.save(syncAdminRole(new User(auth0Subject, safeEmail), safeEmail));
                });
    }

    // Hit on every authenticated request — cache aggressively. Eviction happens via
    // findOrCreateUser (above) and any future role-update path.
    @Transactional(readOnly = true)
    @Cacheable(value = "usersBySubject", key = "#auth0Subject")
    public User findByAuth0Subject(String auth0Subject) {
        return userRepository.findByAuth0Subject(auth0Subject)
                .orElseThrow(() -> new ResourceNotFoundException("User", auth0Subject));
    }

    @Transactional(readOnly = true)
    public Optional<User> findOptionalByAuth0Subject(String auth0Subject) {
        return userRepository.findByAuth0Subject(auth0Subject);
    }

    @Transactional(readOnly = true)
    public User findById(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", id));
    }

    @Transactional(readOnly = true)
    public User findByUsername(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User", username));
    }

    public boolean isUsernameAvailable(String username) {
        return !userRepository.existsByUsername(username);
    }

    @Transactional
    @CacheEvict(value = "usersBySubject", key = "#auth0Subject")
    public User markOnboardingCompleted(String auth0Subject) {
        User user = findByAuth0Subject(auth0Subject);
        if (!user.isOnboardingCompleted()) {
            user.setOnboardingCompleted(true);
            userRepository.save(user);
        }
        return user;
    }

    @Transactional(readOnly = true)
    public Map<UUID, User> findAllByIds(Collection<UUID> ids) {
        return userRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(User::getId, u -> u));
    }

    private User syncAdminRole(User user, String email) {
        if (isConfiguredAdminEmail(email)) {
            user.setRole(UserRole.ADMIN);
        }
        return user;
    }

    private boolean isConfiguredAdminEmail(String email) {
        if (email == null || email.isBlank()) {
            return false;
        }
        return adminEmails.stream()
                .map(String::trim)
                .anyMatch(e -> e.equalsIgnoreCase(email));
    }
}
