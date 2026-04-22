package com.brooks.ai.domain;

import com.brooks.ai.provider.AiProvider;
import com.brooks.common.domain.BaseEntity;
import com.brooks.user.domain.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "user_ai_keys")
@Getter
@Setter
public class UserAiKey extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AiProvider provider;

    @Column(name = "encrypted_key", nullable = false, columnDefinition = "TEXT")
    private String encryptedKey;

    @Column(name = "key_hint", nullable = false, length = 10)
    private String keyHint;

    @Column(name = "model", length = 100)
    private String model;
}
