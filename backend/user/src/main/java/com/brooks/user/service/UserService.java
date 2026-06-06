package com.brooks.user.service;

import com.brooks.common.exception.BusinessException;
import com.brooks.common.exception.ResourceNotFoundException;
import com.brooks.user.audit.AuditService;
import com.brooks.user.domain.PrimaryIntent;
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
                .map(user -> {
                    // Self-heal: an account that never picked a handle gets one
                    // auto-assigned on its next login. Without this the user
                    // shows up in notifications as the gibberish auth0 subject
                    // (the previous fallback ladder leaked synthetic-email
                    // local-parts like "google-oauth2_<id>" into the bell).
                    if (user.getUsername() == null || user.getUsername().isBlank()) {
                        user.setUsername(generateUniqueUsername(user.getEmail(), user.getAuth0Subject()));
                        userRepository.save(user);
                    }
                    return syncAdminRole(user, email, emailVerified);
                })
                .orElseGet(() -> {
                    // The users.email column is UNIQUE NOT NULL, so a blank fallback collides as
                    // soon as a second emailless user signs in. Derive a deterministic per-subject
                    // synthetic so no two emailless users ever share the same slot.
                    String safeEmail = (email == null || email.isBlank())
                            ? auth0Subject.replace("|", "_") + "@noemail.brooks.local"
                            : email;
                    User created = new User(auth0Subject, safeEmail);
                    // Auto-assign a username on creation so every new account
                    // already has a handle. The user can change it later via
                    // the profile editor — this just ensures the field is
                    // never null in production data going forward.
                    created.setUsername(generateUniqueUsername(safeEmail, auth0Subject));
                    return userRepository.save(syncAdminRole(created, safeEmail, emailVerified));
                });
    }

    // Generates a username that is guaranteed unique among the users table.
    // Strategy:
    //   1. If the email is real (not the synthesised @noemail.brooks.local
    //      placeholder), sanitise its local part — lowercase, ASCII-only,
    //      max 30 chars — and use that.
    //   2. Otherwise derive a stable "user_<hash>" from the Auth0 subject so
    //      handle-less Google-OAuth users still get a readable handle
    //      instead of leaking subject IDs into the UI.
    // Collisions resolved by appending _1, _2, ...; the upper bound is
    // pathological-only — we'd need thousands of identical email prefixes.
    private String generateUniqueUsername(String email, String auth0Subject) {
        String base;
        if (email != null && !email.endsWith("@noemail.brooks.local")) {
            String prefix = email.contains("@") ? email.substring(0, email.indexOf('@')) : email;
            base = prefix.toLowerCase().replaceAll("[^a-z0-9_-]+", "_");
            if (base.length() > 30) base = base.substring(0, 30);
        } else {
            String hash = Integer.toHexString(auth0Subject == null ? 0 : auth0Subject.hashCode());
            base = "user_" + hash;
        }
        if (base.isBlank() || base.equals("_")) base = "user";

        String candidate = base;
        int suffix = 0;
        while (userRepository.existsByUsername(candidate)) {
            suffix++;
            candidate = base + "_" + suffix;
            if (suffix > 9_999) {
                // Defensive: give up the sequential walk and use a hash suffix
                // so we can never spin forever on a pathologically common base.
                candidate = base + "_" + Integer.toHexString((auth0Subject + suffix).hashCode());
                break;
            }
        }
        return candidate;
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

    // Persist the user's self-selected onboarding intent (TRAVELER / CREATOR). Evicts the
    // usersBySubject cache so the next /api/me read reflects the choice immediately.
    @Transactional
    @CacheEvict(value = "usersBySubject", key = "#auth0Subject")
    public User setPrimaryIntent(String auth0Subject, String intent) {
        PrimaryIntent parsed;
        try {
            parsed = PrimaryIntent.valueOf(String.valueOf(intent).trim().toUpperCase());
        } catch (IllegalArgumentException | NullPointerException ex) {
            throw new BusinessException("Invalid role: must be TRAVELER or CREATOR");
        }
        User user = findByAuth0Subject(auth0Subject);
        user.setPrimaryIntent(parsed);
        return userRepository.save(user);
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
