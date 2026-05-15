package com.brooks.user.service;

import com.brooks.user.audit.AuditService;
import com.brooks.user.domain.AccountDeletion;
import com.brooks.user.domain.AccountDeletionRequest;
import com.brooks.user.domain.AccountDeletionSource;
import com.brooks.user.domain.User;
import com.brooks.user.domain.UserStatus;
import com.brooks.user.event.UserDeletedEvent;
import com.brooks.user.repository.AccountDeletionRepository;
import com.brooks.user.repository.AccountDeletionRequestRepository;
import com.brooks.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Optional;
import java.util.UUID;

/**
 * Orchestrates Play / App Store mandated account-deletion flows.
 *
 * <p>Three entry points:
 * <ol>
 *   <li>{@link #deleteAuthenticated(String, String)} — the in-app Settings flow</li>
 *   <li>{@link #requestPublicDeletion(String, String, String, String)} — the
 *       public unauth flow; stores a request row + token</li>
 *   <li>{@link #confirmDeletion(String)} — the GET /confirm?token endpoint</li>
 * </ol>
 *
 * <p>All deletions are soft: the user's row is anonymised and marked
 * {@link UserStatus#DELETED}. Owned content (calendar tokens, guides,
 * memories, etc.) is cleaned up by listeners of {@link UserDeletedEvent}
 * in their respective modules.
 *
 * <p>Hard-delete of the soft-deleted row from backups happens via a separate
 * scheduled job (30-day window — TODO, not in this commit).
 */
@Service
@RequiredArgsConstructor
public class AccountDeletionService {

    private static final Logger log = LoggerFactory.getLogger(AccountDeletionService.class);
    private static final Duration TOKEN_TTL = Duration.ofHours(48);
    private static final SecureRandom RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final UserService userService;
    private final AccountDeletionRepository accountDeletionRepository;
    private final AccountDeletionRequestRepository accountDeletionRequestRepository;
    private final AuditService auditService;
    private final ApplicationEventPublisher events;
    private final CacheManager cacheManager;

    /**
     * Soft-deletes the authenticated user. Idempotent: a second call for an
     * already-DELETED user returns silently without re-anonymising.
     */
    @Transactional
    public void deleteAuthenticated(String auth0Subject, String reason) {
        User user = userService.findByAuth0Subject(auth0Subject);
        performSoftDelete(user, reason, AccountDeletionSource.INAPP);
    }

    /**
     * Records a public deletion request. Always returns silently — never
     * reveals whether the email is known to the system (account-enumeration
     * defence). When email is wired up, the {@code token} returned here is
     * what gets emailed; for now an admin reads the row and acts on it.
     *
     * @return the generated token, OR {@code null} if no user matched. Callers
     *         must NOT propagate this difference back to the HTTP response.
     */
    @Transactional
    public String requestPublicDeletion(String email, String reason, String sourceIp, String userAgent) {
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            // Account-enumeration defence: act as if we did the work.
            log.info("Public deletion request for unknown email; ignoring silently");
            return null;
        }
        User user = userOpt.get();
        if (user.getStatus() == UserStatus.DELETED) {
            log.info("Public deletion request for already-deleted user {}; ignoring", user.getId());
            return null;
        }

        String token = generateToken();
        Instant expiresAt = Instant.now().plus(TOKEN_TTL);
        AccountDeletionRequest req = new AccountDeletionRequest(
                token, user.getId(), expiresAt, sourceIp, userAgent, reason);
        accountDeletionRequestRepository.save(req);

        log.info("Public deletion request recorded for user {} — token expires at {}", user.getId(), expiresAt);
        // TODO: send email containing the confirmation link here once mail
        //   service is configured (BACKEND_ACCOUNT_DELETE_TODO.md).
        return token;
    }

    /**
     * Validates a confirmation token and finalises the deletion. Returns
     * {@link ConfirmResult} so the controller can render the right page state.
     */
    @Transactional
    public ConfirmResult confirmDeletion(String token) {
        if (token == null || token.length() < 16 || token.length() > 64) {
            return ConfirmResult.INVALID;
        }
        Optional<AccountDeletionRequest> reqOpt = accountDeletionRequestRepository.findById(token);
        if (reqOpt.isEmpty()) {
            return ConfirmResult.INVALID;
        }
        AccountDeletionRequest req = reqOpt.get();
        if (req.isUsed()) {
            return ConfirmResult.ALREADY_USED;
        }
        if (req.isExpired()) {
            return ConfirmResult.EXPIRED;
        }

        Optional<User> userOpt = userRepository.findById(req.getUserId());
        if (userOpt.isEmpty()) {
            // The user row vanished between request and confirm — treat as already gone.
            req.setUsedAt(Instant.now());
            return ConfirmResult.OK;
        }

        performSoftDelete(userOpt.get(), req.getReason(), AccountDeletionSource.WEB);
        req.setUsedAt(Instant.now());
        return ConfirmResult.OK;
    }

    /**
     * Core soft-delete. Idempotent — second call on an already-DELETED user
     * short-circuits without re-writing PII.
     */
    private void performSoftDelete(User user, String reason, AccountDeletionSource source) {
        if (user.getStatus() == UserStatus.DELETED) {
            log.info("User {} already DELETED; skipping anonymisation", user.getId());
            return;
        }

        UUID userId = user.getId();
        String originalEmail = user.getEmail();
        String hashedEmail = sha256Hex(originalEmail == null ? "" : originalEmail.toLowerCase());

        // Anonymise PII columns. The unique constraints on email + username
        // force per-row unique placeholders — synthesise from the user's UUID.
        String anonymisedEmail = "deleted-" + userId + "@brooks.local";
        String anonymisedUsername = "deleted_" + userId.toString().replace("-", "").substring(0, 12);
        user.setEmail(anonymisedEmail);
        user.setUsername(anonymisedUsername);
        user.setStatus(UserStatus.DELETED);
        // Payout details might contain real bank info — clear too.
        user.setPayoutIban(null);
        user.setPayoutBeneficiaryName(null);
        user.setPayoutCurrency(null);
        userRepository.save(user);

        AccountDeletion audit = new AccountDeletion(userId, hashedEmail, reason, source);
        accountDeletionRepository.save(audit);

        String auditMetadata = source.name() + (reason == null || reason.isBlank() ? "" : ":" + reason);
        auditService.record(userId, com.brooks.user.audit.AuditService.EVENT_ACCOUNT_DELETED, auditMetadata);

        // Evict the @Cacheable lookup in UserService — without this, a
        // subsequent findByAuth0Subject in another transaction can return
        // the pre-anonymisation entity from cache for up to its TTL.
        Cache subjectCache = cacheManager.getCache("usersBySubject");
        if (subjectCache != null && user.getAuth0Subject() != null) {
            subjectCache.evict(user.getAuth0Subject());
        }

        events.publishEvent(new UserDeletedEvent(userId));
        log.info("User {} soft-deleted via {}", userId, source);
    }

    private static String generateToken() {
        byte[] buf = new byte[32];
        RANDOM.nextBytes(buf);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(buf);
    }

    private static String sha256Hex(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 unavailable on this JVM", e);
        }
    }

    /** Outcome of confirming a public deletion request. */
    public enum ConfirmResult {
        OK,
        INVALID,
        EXPIRED,
        ALREADY_USED
    }
}
