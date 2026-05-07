package com.brooks.purchase.service;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.PublicKey;
import java.security.Signature;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;

/**
 * Verifies BOG iPay callbacks per https://api.bog.ge/docs/en/payments/standard-process/callback :
 * "SHA256withRSA" signature on the raw request body, base64 in the {@code Callback-Signature}
 * header, validated with the published BOG public key.
 *
 * Public key shipped at classpath {@code bog/callback-public-key.pem}.
 */
@Component
@Slf4j
public class BogCallbackVerifier {

    private static final String PEM_RESOURCE = "bog/callback-public-key.pem";
    private static final String SIGNATURE_ALGORITHM = "SHA256withRSA";

    private PublicKey publicKey;

    @PostConstruct
    void init() {
        try (InputStream stream = new ClassPathResource(PEM_RESOURCE).getInputStream()) {
            String pem = new String(stream.readAllBytes(), StandardCharsets.UTF_8);
            String base64 = pem
                    .replace("-----BEGIN PUBLIC KEY-----", "")
                    .replace("-----END PUBLIC KEY-----", "")
                    .replaceAll("\\s+", "");
            byte[] keyBytes = Base64.getDecoder().decode(base64);
            KeyFactory keyFactory = KeyFactory.getInstance("RSA");
            this.publicKey = keyFactory.generatePublic(new X509EncodedKeySpec(keyBytes));
        } catch (IOException | RuntimeException | java.security.GeneralSecurityException e) {
            // Fail-fast: refuse to start with broken signature verification — silent acceptance
            // of unsigned/forged callbacks would let attackers complete arbitrary purchases.
            throw new IllegalStateException(
                    "Failed to load BOG callback public key from classpath " + PEM_RESOURCE
                            + " — refusing to start without signature verification.", e);
        }
    }

    /**
     * @param rawBody the exact bytes of the callback request body, before any deserialization
     * @param base64Signature the value of the Callback-Signature header
     * @return true only if a Callback-Signature header is present and verifies against the
     *         published BOG public key. Unsigned callbacks are rejected — payment completion
     *         must always be cryptographically attested.
     */
    public boolean verify(byte[] rawBody, String base64Signature) {
        if (base64Signature == null || base64Signature.isBlank()) {
            log.warn("BOG callback missing Callback-Signature header — rejecting unsigned callback");
            return false;
        }
        try {
            byte[] signature = Base64.getDecoder().decode(base64Signature.trim());
            Signature verifier = Signature.getInstance(SIGNATURE_ALGORITHM);
            verifier.initVerify(publicKey);
            verifier.update(rawBody);
            boolean ok = verifier.verify(signature);
            if (!ok) {
                log.warn("BOG callback signature verification failed");
            }
            return ok;
        } catch (Exception e) {
            log.warn("BOG callback signature verification threw", e);
            return false;
        }
    }
}
