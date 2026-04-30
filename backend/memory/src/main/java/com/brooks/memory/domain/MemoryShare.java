package com.brooks.memory.domain;

import com.brooks.common.domain.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "memory_shares")
@Getter
@Setter
@NoArgsConstructor
public class MemoryShare extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "memory_id", nullable = false)
    private Memory memory;

    @Column(name = "token", nullable = false, unique = true, length = 80)
    private String token;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    public MemoryShare(Memory memory, String token) {
        this.memory = memory;
        this.token = token;
    }
}
