package com.brooks.purchase.api;

import com.brooks.purchase.service.BogCallbackVerifier;
import com.brooks.purchase.service.PurchaseService;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletInputStream;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Pins down the BOG iPay webhook contract end-to-end at the controller level:
 *  - signature verification gates everything
 *  - duplicate deliveries dispatch to the service repeatedly (the service layer
 *    enforces idempotency via atomic UPDATE — that is verified separately)
 *  - service exceptions surface as 5xx so BOG retries
 *  - malformed JSON acks 200 so BOG stops retrying a payload that will never parse
 *
 * The signature itself isn't exercised here (the verifier is mocked); see
 * BogCallbackVerifierTest for that. This test is about the controller's branching.
 */
@ExtendWith(MockitoExtension.class)
class WebhookControllerTest {

    @Mock
    private BogCallbackVerifier verifier;

    @Mock
    private PurchaseService purchaseService;

    private WebhookController controller;
    private ObjectMapper objectMapper;
    private MeterRegistry meterRegistry;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        meterRegistry = new SimpleMeterRegistry();
        controller = new WebhookController(verifier, purchaseService, objectMapper, meterRegistry);
    }

    @Test
    void rejectsMissingSignatureWith400() throws IOException {
        when(verifier.verify(any(byte[].class), eq(null))).thenReturn(false);

        ResponseEntity<String> response = controller.handleBogIpayCallback(
                request(completedPayload("BOG-123"), null));

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        verify(purchaseService, never()).handleCheckoutCompleted(any(), any(), any());
    }

    @Test
    void rejectsInvalidSignatureWith400() throws IOException {
        when(verifier.verify(any(byte[].class), eq("bad-sig"))).thenReturn(false);

        ResponseEntity<String> response = controller.handleBogIpayCallback(
                request(completedPayload("BOG-123"), "bad-sig"));

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        verify(purchaseService, never()).handleCheckoutCompleted(any(), any(), any());
    }

    @Test
    void dispatchesCompletedEventToService() throws IOException {
        when(verifier.verify(any(byte[].class), eq("good-sig"))).thenReturn(true);

        ResponseEntity<String> response = controller.handleBogIpayCallback(
                request(completedPayload("BOG-123"), "good-sig"));

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        verify(purchaseService, times(1)).handleCheckoutCompleted("BOG-123", "AUTH-9", "TXN-7");
    }

    /**
     * BOG re-delivers callbacks until it sees a 200. The controller forwards every
     * delivery to the service; idempotency lives at the service layer (atomic UPDATE
     * of status PENDING → COMPLETED), so two controller invocations are correct here.
     */
    @Test
    void duplicateDeliveryDispatchesToServiceTwice() throws IOException {
        when(verifier.verify(any(byte[].class), eq("good-sig"))).thenReturn(true);

        controller.handleBogIpayCallback(request(completedPayload("BOG-123"), "good-sig"));
        controller.handleBogIpayCallback(request(completedPayload("BOG-123"), "good-sig"));

        verify(purchaseService, times(2)).handleCheckoutCompleted("BOG-123", "AUTH-9", "TXN-7");
    }

    @Test
    void serviceExceptionReturns500ForRetry() throws IOException {
        when(verifier.verify(any(byte[].class), eq("good-sig"))).thenReturn(true);
        doThrow(new RuntimeException("DB blip"))
                .when(purchaseService).handleCheckoutCompleted("BOG-123", "AUTH-9", "TXN-7");

        ResponseEntity<String> response = controller.handleBogIpayCallback(
                request(completedPayload("BOG-123"), "good-sig"));

        assertThat(response.getStatusCode().value()).isEqualTo(500);
    }

    @Test
    void malformedJsonAcksWith200() throws IOException {
        when(verifier.verify(any(byte[].class), eq("good-sig"))).thenReturn(true);

        ResponseEntity<String> response = controller.handleBogIpayCallback(
                request("not json {{{".getBytes(StandardCharsets.UTF_8), "good-sig"));

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        verify(purchaseService, never()).handleCheckoutCompleted(any(), any(), any());
    }

    @Test
    void unsupportedEventIsAckedWithoutDispatch() throws IOException {
        when(verifier.verify(any(byte[].class), eq("good-sig"))).thenReturn(true);
        byte[] payload = ("{\"event\":\"order_authorize\",\"body\":{}}").getBytes(StandardCharsets.UTF_8);

        ResponseEntity<String> response = controller.handleBogIpayCallback(
                request(payload, "good-sig"));

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        verify(purchaseService, never()).handleCheckoutCompleted(any(), any(), any());
        verify(purchaseService, never()).handleCheckoutRefunded(any(), any(), org.mockito.ArgumentMatchers.anyBoolean());
    }

    @Test
    void refundedEventDispatchesToRefundHandler() throws IOException {
        when(verifier.verify(any(byte[].class), eq("good-sig"))).thenReturn(true);
        byte[] payload = ("{\"event\":\"order_payment\",\"body\":{"
                + "\"order_id\":\"BOG-456\","
                + "\"order_status\":{\"key\":\"refunded\"},"
                + "\"purchase_units\":{\"refund_amount\":\"19.00\"}"
                + "}}").getBytes(StandardCharsets.UTF_8);

        ResponseEntity<String> response = controller.handleBogIpayCallback(
                request(payload, "good-sig"));

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        verify(purchaseService, times(1)).handleCheckoutRefunded("BOG-456", "19.00", false);
    }

    private static byte[] completedPayload(String orderId) {
        return ("{\"event\":\"order_payment\",\"body\":{"
                + "\"order_id\":\"" + orderId + "\","
                + "\"order_status\":{\"key\":\"completed\"},"
                + "\"payment_detail\":{\"auth_code\":\"AUTH-9\",\"transaction_id\":\"TXN-7\"}"
                + "}}").getBytes(StandardCharsets.UTF_8);
    }

    private static HttpServletRequest request(byte[] body, String signature) throws IOException {
        HttpServletRequest req = org.mockito.Mockito.mock(HttpServletRequest.class);
        when(req.getInputStream()).thenReturn(new InMemoryServletInputStream(new ByteArrayInputStream(body)));
        when(req.getHeader("Callback-Signature")).thenReturn(signature);
        return req;
    }

    private static class InMemoryServletInputStream extends ServletInputStream {
        private final InputStream delegate;

        InMemoryServletInputStream(InputStream delegate) {
            this.delegate = delegate;
        }

        @Override
        public boolean isFinished() {
            try { return delegate.available() == 0; } catch (IOException e) { return true; }
        }

        @Override
        public boolean isReady() { return true; }

        @Override
        public void setReadListener(ReadListener readListener) { /* synchronous */ }

        @Override
        public int read() throws IOException { return delegate.read(); }
    }
}
