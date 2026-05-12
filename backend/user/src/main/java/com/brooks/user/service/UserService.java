package com.brooks.user.service;

import com.brooks.common.exception.ResourceNotFoundException;
import com.brooks.user.audit.AuditService;
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
    private final AuditService auditService;

    @Value("${app.admin-emails:}")
    private List<String> adminEmails;

    // Evict the cached lookup on the find-or-create path because the user's role/email may
    // have just changed (admin email syncing, first-time creation).
    @Transactional
    @CacheEvict(value = "usersBySubject", key = "#auth0Subject")
    public User findOrCreateUser(String auth0Subject, String email, boolean emailVerified) {
        return userRepository.findByAuth0Subject(auth0Subject)
                .map(user -> syncAdminRole(user, email, emailVerified))
                .orElseGet(() -> {
                    // The users.email column is UNIQUE NOT NULL, so a blank fallback collides as
                    // soon as a second emailless user signs in. Derive a deterministic per-subject
                    // synthetic so no two emailless users ever share the same slot.
                    String safeEmail = (email == null || email.isBlank())
                            ? auth0Subject.replace("|", "_") + "@noemail.brooks.local"
                            : email;
                    return userRepository.save(syncAdminRole(new User(auth0Subject, safeEmail), safeEmail, emailVerified));
                });
    }

    // Backwards-compatible overload; callers that don't yet pass email_verified are treated as unverified
    // (so admin role is never auto-granted via this path).
    @Transactional
    @CacheEvict(value = "usersBySubject", key = "#auth0Subject")
    public User findOrCreateUser(String auth0Subject, String email) {
        return findOrCreateUser(auth0Subject, email, false);
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

    @Transactional
    @CacheEvict(value = "usersBySubject", key = "#auth0Subject")
    public User updatePayoutDetails(String auth0Subject, String iban, String beneficiaryName, String currency) {
        User user = findByAuth0Subject(auth0Subject);
        String previousIbanMasked = maskIban(user.getPayoutIban());
        user.setPayoutIban(blankToNull(iban));
        user.setPayoutBeneficiaryName(blankToNull(beneficiaryName));
        user.setPayoutCurrency(blankToNull(currency == null ? null : currency.toUpperCase()));
        User saved = userRepository.save(user);
        String newIbanMasked = maskIban(saved.getPayoutIban());
        auditService.record(
                saved.getId(),
                AuditService.EVENT_PAYOUT_DETAILS_UPDATED,
                "from=" + previousIbanMasked + ";to=" + newIbanMasked
        );
        return saved;
    }

    // Audit log must never store full IBAN. Keep first 4 + last 4 to allow forensic comparison
    // without exposing payment routing info to anyone who reads the table.
    private static String maskIban(String iban) {
        if (iban == null) return "null";
        String trimmed = iban.trim();
        if (trimmed.length() <= 8) return "***";
        return trimmed.substring(0, 4) + "..." + trimmed.substring(trimmed.length() - 4);
    }

    private static String blankToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    @Transactional(readOnly = true)
    public Map<UUID, User> findAllByIds(Collection<UUID> ids) {
        return userRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(User::getId, u -> u));
    }

    private User syncAdminRole(User user, String email, boolean emailVerified) {
        if (isConfiguredAdminEmail(email) && emailVerified) {
            if (user.getRole() != UserRole.ADMIN) {
                user.setRole(UserRole.ADMIN);
                if (user.getId() != null) {
                    auditService.record(user.getId(), AuditService.EVENT_ADMIN_ROLE_GRANT, "email=" + email);
                }
            }
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
