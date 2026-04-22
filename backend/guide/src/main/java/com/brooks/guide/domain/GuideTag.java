package com.brooks.guide.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "guide_tags")
@Getter
@Setter
@NoArgsConstructor
public class GuideTag {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "guide_id", nullable = false)
    private Guide guide;

    @Column(name = "tag", nullable = false, length = 100)
    private String tag;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public GuideTag(Guide guide, String tag) {
        this.guide = guide;
        this.tag = tag;
    }
}
