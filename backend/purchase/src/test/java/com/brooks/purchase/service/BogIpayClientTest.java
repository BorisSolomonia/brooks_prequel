package com.brooks.purchase.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Pure-function tests for {@link BogIpayClient} helpers.
 *
 * The idempotency-key derivation is the load-bearing piece — if it changes,
 * BOG will stop deduping our retries and we risk double-charges (createOrder)
 * or double-refunds. These tests pin the wire-format down.
 */
class BogIpayClientTest {

    @Test
    void createOrderIdempotencyKeyIsDeterministicFromShopOrderId() {
        String key1 = BogIpayClient.createOrderIdempotencyKey("ORDER-123");
        String key2 = BogIpayClient.createOrderIdempotencyKey("ORDER-123");
        assertThat(key1).isEqualTo(key2);
        assertThat(key1).isEqualTo("create:ORDER-123");
    }

    @Test
    void createOrderIdempotencyKeyDiffersByShopOrderId() {
        assertThat(BogIpayClient.createOrderIdempotencyKey("A"))
                .isNotEqualTo(BogIpayClient.createOrderIdempotencyKey("B"));
    }

    @Test
    void refundIdempotencyKeyDistinguishesFullFromPartial() {
        String full = BogIpayClient.refundIdempotencyKey("ord-1", null);
        String partial = BogIpayClient.refundIdempotencyKey("ord-1", 100L);
        assertThat(full).isEqualTo("refund:ord-1:full");
        assertThat(partial).isEqualTo("refund:ord-1:100");
        assertThat(full).isNotEqualTo(partial);
    }

    @Test
    void refundIdempotencyKeyDistinguishesByAmount() {
        assertThat(BogIpayClient.refundIdempotencyKey("ord-1", 100L))
                .isNotEqualTo(BogIpayClient.refundIdempotencyKey("ord-1", 200L));
    }

    @Test
    void refundAndCreateKeysNeverCollide() {
        assertThat(BogIpayClient.createOrderIdempotencyKey("ord-1"))
                .isNotEqualTo(BogIpayClient.refundIdempotencyKey("ord-1", null));
    }

    @Test
    void parseGelMinorUnitsHandlesBoundaryInputs() {
        assertThat(BogIpayClient.parseGelMinorUnits(null)).isNull();
        assertThat(BogIpayClient.parseGelMinorUnits("")).isNull();
        assertThat(BogIpayClient.parseGelMinorUnits("   ")).isNull();
        assertThat(BogIpayClient.parseGelMinorUnits("not a number")).isNull();
        assertThat(BogIpayClient.parseGelMinorUnits("0")).isEqualTo(0L);
        assertThat(BogIpayClient.parseGelMinorUnits("0.01")).isEqualTo(1L);
        assertThat(BogIpayClient.parseGelMinorUnits("12.34")).isEqualTo(1234L);
        assertThat(BogIpayClient.parseGelMinorUnits(" 12.34 ")).isEqualTo(1234L);
    }
}
