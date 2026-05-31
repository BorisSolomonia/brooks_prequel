package com.brooks.purchase.dto;

import java.time.Instant;
import java.util.UUID;

/**
 * One completed sale, fully denormalized for the admin transaction log
 * (GET /api/admin/transactions). Joins the payment record with the guide, both parties, the
 * creator's payout details, and the earnings/payout ledger. ADMIN-only — contains buyer email and
 * the creator's full IBAN by design (the operator needs them to pay out and handle disputes).
 */
public record AdminTransactionResponse(
        UUID purchaseId,
        Instant saleTime,          // completed_at (falls back to created_at if null)
        // Guide + parties
        UUID guideId,
        String guideTitle,
        UUID creatorId,
        String creatorName,
        String creatorUsername,
        UUID buyerId,
        String buyerName,
        String buyerEmail,
        // Money breakdown (minor units / cents)
        int grossCents,
        int commissionCents,
        int netCents,
        String currency,
        Integer commissionRateBps,
        // Creator payout details
        String creatorIban,
        String creatorBeneficiaryName,
        String payoutCurrency,
        String payoutStatus,       // PENDING / PAID / REVERSED / CLAWBACK_DUE / REVIEW (or null)
        Instant paidAt,
        // BOG references
        String bogOrderId,
        String externalOrderId,
        String bogIpayPaymentId,
        String bogTransactionId,
        String status
) {}
