package com.brooks.purchase.service;

import com.brooks.guide.domain.Guide;
import com.brooks.profile.repository.UserProfileRepository;
import com.brooks.purchase.domain.CreatorEarning;
import com.brooks.purchase.domain.Purchase;
import com.brooks.purchase.repository.CreatorEarningRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Pins the refund-reversal contract: a refunded sale must stop being payable (or be flagged
 * for clawback if already paid), and duplicate refund callbacks must be no-ops. Without this,
 * refunds silently over-pay creators.
 */
@ExtendWith(MockitoExtension.class)
class CreatorEarningsRecorderTest {

    @Mock
    private UserProfileRepository profileRepository;

    @Mock
    private CreatorEarningRepository creatorEarningRepository;

    @InjectMocks
    private CreatorEarningsRecorder recorder;

    private static CreatorEarning earningWithStatus(String status) {
        CreatorEarning e = new CreatorEarning();
        e.setPurchaseId(UUID.randomUUID());
        e.setCreatorId(UUID.randomUUID());
        e.setGrossAmountCents(1900);
        e.setCommissionCents(190);
        e.setNetAmountCents(1710);
        e.setPayoutStatus(status);
        return e;
    }

    @Test
    void fullRefundOnPendingEarningReversesIt() {
        UUID purchaseId = UUID.randomUUID();
        CreatorEarning earning = earningWithStatus("PENDING");
        when(creatorEarningRepository.findByPurchaseId(purchaseId)).thenReturn(Optional.of(earning));

        CreatorEarningsRecorder.RefundOutcome outcome = recorder.reverseForRefund(purchaseId, false);

        assertThat(outcome).isEqualTo(CreatorEarningsRecorder.RefundOutcome.REVERSED);
        assertThat(earning.getPayoutStatus()).isEqualTo("REVERSED");
        verify(creatorEarningRepository).save(earning);
    }

    @Test
    void fullRefundOnPaidEarningFlagsClawback() {
        UUID purchaseId = UUID.randomUUID();
        CreatorEarning earning = earningWithStatus("PAID");
        when(creatorEarningRepository.findByPurchaseId(purchaseId)).thenReturn(Optional.of(earning));

        CreatorEarningsRecorder.RefundOutcome outcome = recorder.reverseForRefund(purchaseId, false);

        assertThat(outcome).isEqualTo(CreatorEarningsRecorder.RefundOutcome.CLAWBACK_DUE);
        assertThat(earning.getPayoutStatus()).isEqualTo("CLAWBACK_DUE");
        verify(creatorEarningRepository).save(earning);
    }

    @Test
    void partialRefundOnPendingEarningHoldsForReview() {
        UUID purchaseId = UUID.randomUUID();
        CreatorEarning earning = earningWithStatus("PENDING");
        when(creatorEarningRepository.findByPurchaseId(purchaseId)).thenReturn(Optional.of(earning));

        CreatorEarningsRecorder.RefundOutcome outcome = recorder.reverseForRefund(purchaseId, true);

        assertThat(outcome).isEqualTo(CreatorEarningsRecorder.RefundOutcome.FLAGGED_REVIEW);
        assertThat(earning.getPayoutStatus()).isEqualTo("REVIEW");
        verify(creatorEarningRepository).save(earning);
    }

    @Test
    void partialRefundOnPaidEarningFlagsClawbackWithoutMutatingPaidRecord() {
        UUID purchaseId = UUID.randomUUID();
        CreatorEarning earning = earningWithStatus("PAID");
        when(creatorEarningRepository.findByPurchaseId(purchaseId)).thenReturn(Optional.of(earning));

        CreatorEarningsRecorder.RefundOutcome outcome = recorder.reverseForRefund(purchaseId, true);

        assertThat(outcome).isEqualTo(CreatorEarningsRecorder.RefundOutcome.CLAWBACK_DUE);
        // PAID record is preserved (payment history intact) — surfaced via the outcome only.
        assertThat(earning.getPayoutStatus()).isEqualTo("PAID");
        verify(creatorEarningRepository, never()).save(earning);
    }

    @Test
    void recordsEarningAndIncrementsCountForCompletedPurchase() {
        UUID creatorId = UUID.randomUUID();
        UUID purchaseId = UUID.randomUUID();
        Purchase purchase = mock(Purchase.class);
        when(purchase.getId()).thenReturn(purchaseId);
        when(purchase.getPriceCentsPaid()).thenReturn(1900);
        when(purchase.getCommissionRateBps()).thenReturn(1000);
        when(purchase.getPlatformFeeCents()).thenReturn(190);
        Guide guide = mock(Guide.class);
        when(guide.getCreatorId()).thenReturn(creatorId);
        when(creatorEarningRepository.existsByPurchaseId(purchaseId)).thenReturn(false);

        recorder.recordForCompletedPurchase(purchase, guide);

        verify(profileRepository).incrementPurchaseCount(creatorId);
        ArgumentCaptor<CreatorEarning> saved = ArgumentCaptor.forClass(CreatorEarning.class);
        verify(creatorEarningRepository).save(saved.capture());
        assertThat(saved.getValue().getCreatorId()).isEqualTo(creatorId);
        assertThat(saved.getValue().getNetAmountCents()).isEqualTo(1710); // 1900 - 190 fee
    }

    /**
     * BOR-81/82 money-path regression: a COMPLETED purchase whose guide row is missing must NOT
     * silently record nothing AND must not crash the completion — it records no earning, does not
     * increment the count, and (see the logged ERROR in the service) surfaces for reconciliation.
     */
    @Test
    void missingGuideRecordsNoEarningAndDoesNotIncrementCount() {
        Purchase purchase = mock(Purchase.class);

        recorder.recordForCompletedPurchase(purchase, null);

        verify(creatorEarningRepository, never()).save(any());
        verify(profileRepository, never()).incrementPurchaseCount(any());
    }

    @Test
    void refundWithNoEarningIsNoOp() {
        UUID purchaseId = UUID.randomUUID();
        when(creatorEarningRepository.findByPurchaseId(purchaseId)).thenReturn(Optional.empty());

        CreatorEarningsRecorder.RefundOutcome outcome = recorder.reverseForRefund(purchaseId, false);

        assertThat(outcome).isEqualTo(CreatorEarningsRecorder.RefundOutcome.NO_EARNING);
        verify(creatorEarningRepository, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void duplicateRefundDeliveryOnReversedEarningIsIdempotent() {
        UUID purchaseId = UUID.randomUUID();
        CreatorEarning earning = earningWithStatus("REVERSED");
        when(creatorEarningRepository.findByPurchaseId(purchaseId)).thenReturn(Optional.of(earning));

        CreatorEarningsRecorder.RefundOutcome outcome = recorder.reverseForRefund(purchaseId, false);

        assertThat(outcome).isEqualTo(CreatorEarningsRecorder.RefundOutcome.ALREADY_RESOLVED);
        assertThat(earning.getPayoutStatus()).isEqualTo("REVERSED");
        verify(creatorEarningRepository, never()).save(earning);
    }
}
