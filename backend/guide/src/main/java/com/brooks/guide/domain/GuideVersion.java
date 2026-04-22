package com.brooks.guide.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "guide_versions")
@Getter
@Setter
@NoArgsConstructor
public class GuideVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "guide_id", nullable = false)
    private UUID guideId;

    @Column(name = "version_number", nullable = false)
    private int versionNumber;

    @Column(name = "snapshot", nullable = false, columnDefinition = "JSONB")
    @JdbcTypeCode(SqlTypes.JSON)
    private String snapshot;

    @Column(name = "published_at", nullable = false)
    private Instant publishedAt = Instant.now();

    public GuideVersion(UUID guideId, int versionNumber, String snapshot) {
        this.guideId = guideId;
        this.versionNumber = versionNumber;
        this.snapshot = snapshot;
    }
}
