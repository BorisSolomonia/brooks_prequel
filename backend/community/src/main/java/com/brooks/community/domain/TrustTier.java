package com.brooks.community.domain;

/**
 * Coarse, hard-to-fingerprint reputation exposure. A per-report numeric count would itself
 * de-anonymise a responder, so only this wide tier is ever shown — and only above the
 * k-anonymity threshold.
 */
public enum TrustTier {
    NONE,
    TRUSTED
}
