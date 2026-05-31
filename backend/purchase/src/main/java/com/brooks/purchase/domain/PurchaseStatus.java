package com.brooks.purchase.domain;

public enum PurchaseStatus {
    PENDING,
    COMPLETED,
    REFUNDED,
    // Terminal state for a checkout BOG reported as rejected/declined. Never grants access.
    FAILED
}
