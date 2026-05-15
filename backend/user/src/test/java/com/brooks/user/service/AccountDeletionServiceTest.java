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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * Unit tests for the deletion service. Mirrors the curl smoke-test scenarios
 * documented in the Play-Store-prep memo, plus edge cases that would only
 * surface in production (cache staleness, idempotency, account enumeration).
 */
@ExtendWith(MockitoExtension.class)
class AccountDeletionServiceTest {

    private static final String SUBJECT = "auth0|user-1";
    private static final String EMAIL = "Real@Example.com";
    private static final String IP = "203.0.113.7";
    private static final String UA = "Mozilla/5.0 (smoke test)";

    @Mock private UserRepository userRepository;
    @Mock private UserService userService;
    @Mock private AccountDeletionRepository accountDeletionRepository;
    @Mock private AccountDeletionRequestRepository accountDeletionRequestRepository;
    @Mock private AuditService auditService;
    @Mock private ApplicationEventPublisher events;
    @Mock private CacheManager cacheManager;
    @Mock private Cache subjectCache;

    private AccountDeletionService service;
    private User user;

    @BeforeEach
    void setUp() {
        service = new AccountDeletionService(
                userRepository,
                userService,
                accountDeletionRepository,
                accountDeletionRequestRepository,
                auditService,
                events,
                cacheManager
        );

        user = new User(SUBJECT, EMAIL);
        // BaseEntity.id is normally set by JPA; force it for predictable assertions.
        ReflectionTestUtils.setField(user, "id", UUID.fromString("11111111-1111-1111-1111-111111111111"));
        user.setUsername("realuser");
        user.setStatus(UserStatus.ACTIVE);
        user.setPayoutIban("GE00BG0000123456789012");
        user.setPayoutBeneficiaryName("Boris Real Name");
        user.setPayoutCurrency("GEL");

        // Most tests touch the cache; lenient so cache-less paths don't trigger
        // UnnecessaryStubbingException.
        lenient().when(cacheManager.getCache("usersBySubject")).thenReturn(subjectCache);
    }

    // ──────────────────────────────────────────────────────────────────
    // deleteAuthenticated
    // ──────────────────────────────────────────────────────────────────

    @Test
    void deleteAuthenticatedSoftDeletesAndAnonymisesAndPublishesEvent() {
        when(userService.findByAuth0Subject(SUBJECT)).thenReturn(user);

        service.deleteAuthenticated(SUBJECT, "moving to a competitor");

        // Status flipped + PII overwritten
        assertThat(user.getStatus()).isEqualTo(UserStatus.DELETED);
        assertThat(user.getEmail()).isEqualTo("deleted-" + user.getId() + "@brooks.local");
        assertThat(user.getUsername()).startsWith("deleted_");
        assertThat(user.getUsername()).hasSize("deleted_".length() + 12);

        // Financial PII cleared
        assertThat(user.getPayoutIban()).isNull();
        assertThat(user.getPayoutBeneficiaryName()).isNull();
        assertThat(user.getPayoutCurrency()).isNull();

        // Persisted, audited, event-published, cache-evicted
        verify(userRepository).save(user);
        ArgumentCaptor<AccountDeletion> auditCaptor = ArgumentCaptor.forClass(AccountDeletion.class);
        verify(accountDeletionRepository).save(auditCaptor.capture());
        assertThat(auditCaptor.getValue().getSource()).isEqualTo(AccountDeletionSource.INAPP);
        assertThat(auditCaptor.getValue().getReason()).isEqualTo("moving to a competitor");
        // hashed email is sha256("real@example.com") — lowercased
        assertThat(auditCaptor.getValue().getHashedEmail())
                .hasSize(64)
                .matches("[0-9a-f]+");

        verify(auditService).record(eq(user.getId()), eq(AuditService.EVENT_ACCOUNT_DELETED), anyString());
        verify(events).publishEvent(any(UserDeletedEvent.class));
        verify(subjectCache).evict(SUBJECT);
    }

    @Test
    void deleteAuthenticatedIsIdempotentForAlreadyDeletedUser() {
        user.setStatus(UserStatus.DELETED);
        user.setEmail("deleted-" + user.getId() + "@brooks.local");
        when(userService.findByAuth0Subject(SUBJECT)).thenReturn(user);

        service.deleteAuthenticated(SUBJECT, "double-click");

        // No re-anonymisation, no second audit row, no second event
        verify(userRepository, never()).save(any());
        verify(accountDeletionRepository, never()).save(any());
        verifyNoInteractions(events, auditService);
        verify(subjectCache, never()).evict(anyString());
    }

    @Test
    void deleteAuthenticatedRecordsHashedEmailForAuditButNotPlaintext() {
        when(userService.findByAuth0Subject(SUBJECT)).thenReturn(user);

        service.deleteAuthenticated(SUBJECT, null);

        ArgumentCaptor<AccountDeletion> captor = ArgumentCaptor.forClass(AccountDeletion.class);
        verify(accountDeletionRepository).save(captor.capture());
        String hash = captor.getValue().getHashedEmail();
        // The hash is a hex SHA-256 of the LOWERCASED original email, must match a fresh
        // computation. This is also the de-dup contract — the audit row must be reproducible
        // from the email alone.
        assertThat(hash)
                .isNotEqualTo(EMAIL)
                .isNotEqualTo(EMAIL.toLowerCase())
                .isEqualTo(sha256Hex(EMAIL.toLowerCase()))
                .hasSize(64)
                .matches("[0-9a-f]+");
    }

    @Test
    void deleteAuthenticatedTolerantWhenCacheManagerHasNoCache() {
        when(userService.findByAuth0Subject(SUBJECT)).thenReturn(user);
        when(cacheManager.getCache("usersBySubject")).thenReturn(null);

        // Should not throw; just skip the eviction
        service.deleteAuthenticated(SUBJECT, null);

        assertThat(user.getStatus()).isEqualTo(UserStatus.DELETED);
        verify(userRepository).save(user);
    }

    // ──────────────────────────────────────────────────────────────────
    // requestPublicDeletion
    // ──────────────────────────────────────────────────────────────────

    @Test
    void requestPublicDeletionReturnsNullForUnknownEmail() {
        when(userRepository.findByEmail("unknown@example.com")).thenReturn(Optional.empty());

        String token = service.requestPublicDeletion("unknown@example.com", null, IP, UA);

        assertThat(token).isNull();
        verify(accountDeletionRequestRepository, never()).save(any());
    }

    @Test
    void requestPublicDeletionReturnsNullForAlreadyDeletedUser() {
        user.setStatus(UserStatus.DELETED);
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));

        String token = service.requestPublicDeletion(EMAIL, "lost device", IP, UA);

        assertThat(token).isNull();
        verify(accountDeletionRequestRepository, never()).save(any());
    }

    @Test
    void requestPublicDeletionStoresRowAndReturnsTokenForKnownUser() {
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));

        Instant before = Instant.now();
        String token = service.requestPublicDeletion(EMAIL, "lost device", IP, UA);
        Instant after = Instant.now();

        // 32-byte URL-safe Base64 → 43 chars (no padding)
        assertThat(token).isNotNull();
        assertThat(token).hasSize(43);

        ArgumentCaptor<AccountDeletionRequest> captor = ArgumentCaptor.forClass(AccountDeletionRequest.class);
        verify(accountDeletionRequestRepository).save(captor.capture());
        AccountDeletionRequest saved = captor.getValue();
        assertThat(saved.getToken()).isEqualTo(token);
        assertThat(saved.getUserId()).isEqualTo(user.getId());
        assertThat(saved.getReason()).isEqualTo("lost device");
        assertThat(saved.getSourceIp()).isEqualTo(IP);
        assertThat(saved.getUserAgent()).isEqualTo(UA);

        // ~48h ttl, ±1 minute slack
        Instant expectedExpiry = before.plus(48, ChronoUnit.HOURS);
        assertThat(saved.getExpiresAt())
                .isBetween(expectedExpiry.minusSeconds(60), after.plus(48, ChronoUnit.HOURS).plusSeconds(60));
    }

    // ──────────────────────────────────────────────────────────────────
    // confirmDeletion
    // ──────────────────────────────────────────────────────────────────

    @Test
    void confirmDeletionReturnsInvalidForUnknownToken() {
        when(accountDeletionRequestRepository.findById("a-valid-length-token-but-unknown-1234567")).thenReturn(Optional.empty());

        AccountDeletionService.ConfirmResult result =
                service.confirmDeletion("a-valid-length-token-but-unknown-1234567");

        assertThat(result).isEqualTo(AccountDeletionService.ConfirmResult.INVALID);
    }

    @Test
    void confirmDeletionReturnsInvalidForTooShortToken() {
        AccountDeletionService.ConfirmResult result = service.confirmDeletion("short");

        assertThat(result).isEqualTo(AccountDeletionService.ConfirmResult.INVALID);
        verify(accountDeletionRequestRepository, never()).findById(anyString());
    }

    @Test
    void confirmDeletionReturnsInvalidForNullToken() {
        AccountDeletionService.ConfirmResult result = service.confirmDeletion(null);
        assertThat(result).isEqualTo(AccountDeletionService.ConfirmResult.INVALID);
    }

    @Test
    void confirmDeletionReturnsAlreadyUsedForUsedToken() {
        AccountDeletionRequest req = newRequest("a-valid-length-token-already-used-12345678");
        req.setUsedAt(Instant.now().minus(1, ChronoUnit.HOURS));
        when(accountDeletionRequestRepository.findById(req.getToken())).thenReturn(Optional.of(req));

        AccountDeletionService.ConfirmResult result = service.confirmDeletion(req.getToken());

        assertThat(result).isEqualTo(AccountDeletionService.ConfirmResult.ALREADY_USED);
        verify(userRepository, never()).save(any());
    }

    @Test
    void confirmDeletionReturnsExpiredForPastExpiryToken() {
        AccountDeletionRequest req = newRequest("a-valid-length-expired-token-1234567890ab");
        // override expiry in the past
        ReflectionTestUtils.setField(req, "expiresAt", Instant.now().minus(1, ChronoUnit.HOURS));
        when(accountDeletionRequestRepository.findById(req.getToken())).thenReturn(Optional.of(req));

        AccountDeletionService.ConfirmResult result = service.confirmDeletion(req.getToken());

        assertThat(result).isEqualTo(AccountDeletionService.ConfirmResult.EXPIRED);
        verify(userRepository, never()).save(any());
    }

    @Test
    void confirmDeletionWithValidTokenSoftDeletesUserAndMarksTokenUsed() {
        AccountDeletionRequest req = newRequest("a-valid-length-token-fresh-1234567890abcd");
        when(accountDeletionRequestRepository.findById(req.getToken())).thenReturn(Optional.of(req));
        when(userRepository.findById(req.getUserId())).thenReturn(Optional.of(user));

        AccountDeletionService.ConfirmResult result = service.confirmDeletion(req.getToken());

        assertThat(result).isEqualTo(AccountDeletionService.ConfirmResult.OK);
        // user soft-deleted
        assertThat(user.getStatus()).isEqualTo(UserStatus.DELETED);
        verify(userRepository).save(user);
        // token marked used
        assertThat(req.getUsedAt()).isNotNull();
        // audit recorded as WEB source
        ArgumentCaptor<AccountDeletion> auditCaptor = ArgumentCaptor.forClass(AccountDeletion.class);
        verify(accountDeletionRepository).save(auditCaptor.capture());
        assertThat(auditCaptor.getValue().getSource()).isEqualTo(AccountDeletionSource.WEB);
    }

    @Test
    void confirmDeletionTreatsMissingUserAsAlreadyDeleted() {
        AccountDeletionRequest req = newRequest("a-valid-length-token-userMissing--12345AB");
        when(accountDeletionRequestRepository.findById(req.getToken())).thenReturn(Optional.of(req));
        when(userRepository.findById(req.getUserId())).thenReturn(Optional.empty());

        AccountDeletionService.ConfirmResult result = service.confirmDeletion(req.getToken());

        assertThat(result).isEqualTo(AccountDeletionService.ConfirmResult.OK);
        // token still marked used
        assertThat(req.getUsedAt()).isNotNull();
        // no user save attempted
        verify(userRepository, never()).save(any());
    }

    // ──────────────────────────────────────────────────────────────────
    // Helpers
    // ──────────────────────────────────────────────────────────────────

    private AccountDeletionRequest newRequest(String token) {
        return new AccountDeletionRequest(
                token,
                user.getId(),
                Instant.now().plus(24, ChronoUnit.HOURS),
                IP,
                UA,
                "lost access"
        );
    }

    private static String sha256Hex(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
