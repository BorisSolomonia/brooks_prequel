package com.brooks.guide.domain;

import com.brooks.common.domain.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Entity
@Table(
        name = "saved_guides",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_saved_guides_user_guide", columnNames = {"user_id", "guide_id"})
        }
)
@Getter
@Setter
@NoArgsConstructor
public class SavedGuide extends BaseEntity {

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "guide_id", nullable = false)
    private UUID guideId;

    public SavedGuide(UUID userId, UUID guideId) {
        this.userId = userId;
        this.guideId = guideId;
    }
}
