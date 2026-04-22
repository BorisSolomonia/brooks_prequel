package com.brooks.user.service;

import com.brooks.common.exception.ResourceNotFoundException;
import com.brooks.user.domain.User;
import com.brooks.user.domain.UserRole;
import com.brooks.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
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

    @Transactional
    public User findOrCreateUser(String auth0Subject, String email) {
        return userRepository.findByAuth0Subject(auth0Subject)
                .orElseGet(() -> {
                    User user = new User(auth0Subject, email);
                    if (adminEmails.contains(email)) {
                        user.setRole(UserRole.ADMIN);
                    }
                    return userRepository.save(user);
                });
    }

    @Transactional(readOnly = true)
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

    @Transactional(readOnly = true)
    public Map<UUID, User> findAllByIds(Collection<UUID> ids) {
        return userRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(User::getId, u -> u));
    }
}
