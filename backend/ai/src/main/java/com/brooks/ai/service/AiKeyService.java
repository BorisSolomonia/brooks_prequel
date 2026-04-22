package com.brooks.ai.service;

import com.brooks.ai.crypto.AiKeyCipher;
import com.brooks.ai.domain.UserAiKey;
import com.brooks.ai.dto.AiKeyResponse;
import com.brooks.ai.dto.DecryptedKey;
import com.brooks.ai.provider.AiProvider;
import com.brooks.ai.repository.UserAiKeyRepository;
import com.brooks.user.domain.User;
import com.brooks.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AiKeyService {

    private final UserAiKeyRepository repository;
    private final AiKeyCipher cipher;
    private final UserService userService;

    public List<AiKeyResponse> listKeys(UUID userId) {
        return repository.findAllByUserId(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public AiKeyResponse saveKey(UUID userId, AiProvider provider, String rawKey, String model) {
        User user = userService.findById(userId);
        String encrypted = cipher.encrypt(rawKey);
        String hint = rawKey.substring(Math.max(0, rawKey.length() - 4));

        UserAiKey key = repository.findByUserIdAndProvider(userId, provider)
                .orElse(new UserAiKey());
        key.setUser(user);
        key.setProvider(provider);
        key.setEncryptedKey(encrypted);
        key.setKeyHint(hint);
        key.setModel(model);
        return toResponse(repository.save(key));
    }

    @Transactional
    public void deleteKey(UUID userId, AiProvider provider) {
        repository.deleteByUserIdAndProvider(userId, provider);
    }

    // Package-private: used only by AiChatService — never exposes raw key in responses
    DecryptedKey decryptKey(UUID userId, AiProvider provider) {
        return repository.findByUserIdAndProvider(userId, provider)
                .map(k -> new DecryptedKey(cipher.decrypt(k.getEncryptedKey()), k.getModel()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "No API key configured for provider " + provider));
    }

    private AiKeyResponse toResponse(UserAiKey key) {
        return new AiKeyResponse(key.getProvider(), key.getKeyHint(), key.getModel(), key.getUpdatedAt());
    }
}
