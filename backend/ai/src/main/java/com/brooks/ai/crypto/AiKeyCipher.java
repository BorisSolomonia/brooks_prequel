package com.brooks.ai.crypto;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;
import java.util.HexFormat;

@Component
public class AiKeyCipher {

    private static final int IV_LEN = 12;
    private static final int TAG_BITS = 128;
    private static final String ALGORITHM = "AES/GCM/NoPadding";

    private final SecretKey secretKey;

    public AiKeyCipher(@Value("${ai.key-encryption-secret}") String hexSecret) {
        byte[] keyBytes = HexFormat.of().parseHex(hexSecret);
        this.secretKey = new SecretKeySpec(keyBytes, "AES");
    }

    public String encrypt(String plaintext) {
        try {
            byte[] iv = new byte[IV_LEN];
            new SecureRandom().nextBytes(iv);
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.ENCRYPT_MODE, secretKey, new GCMParameterSpec(TAG_BITS, iv));
            byte[] cipherAndTag = cipher.doFinal(plaintext.getBytes());
            byte[] combined = new byte[IV_LEN + cipherAndTag.length];
            System.arraycopy(iv, 0, combined, 0, IV_LEN);
            System.arraycopy(cipherAndTag, 0, combined, IV_LEN, cipherAndTag.length);
            return Base64.getEncoder().encodeToString(combined);
        } catch (Exception e) {
            throw new IllegalStateException("Encryption failed", e);
        }
    }

    public String decrypt(String base64Combined) {
        try {
            byte[] combined = Base64.getDecoder().decode(base64Combined);
            byte[] iv = Arrays.copyOfRange(combined, 0, IV_LEN);
            byte[] cipherAndTag = Arrays.copyOfRange(combined, IV_LEN, combined.length);
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.DECRYPT_MODE, secretKey, new GCMParameterSpec(TAG_BITS, iv));
            return new String(cipher.doFinal(cipherAndTag));
        } catch (Exception e) {
            throw new IllegalStateException("Decryption failed", e);
        }
    }
}
