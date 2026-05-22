package com.brooks.guide.domain;

/**
 * How a guide is monetised — drives the checkout path in
 * GuidePurchaseService.createCheckoutSession.
 *
 *   PAID                 — normal flow. price_cents > 0; checkout goes
 *                          through BOG iPay.
 *   FREE_PUBLIC          — anyone can claim it for free. iPay skipped;
 *                          a GuidePurchase row is created with
 *                          provider = "free-public" and amount_cents = 0.
 *   FREE_FOR_FOLLOWERS   — only users who already follow the creator
 *                          can claim it for free. Non-followers see
 *                          the regular paid CTA. iPay skipped on the
 *                          follower's claim; provider = "follower-free".
 *
 * Once a GuidePurchase row is created (under ANY of these modes) the
 * recipient owns the guide permanently — unfollowing the creator does
 * NOT revoke access. This matches the "purchases are immutable" rule
 * already enforced for gifted guides and paid checkouts.
 */
public enum GuidePricingMode {
    PAID,
    FREE_PUBLIC,
    FREE_FOR_FOLLOWERS
}
