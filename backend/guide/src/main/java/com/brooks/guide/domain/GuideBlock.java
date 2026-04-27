package com.brooks.guide.domain;

import com.brooks.common.domain.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.BatchSize;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "guide_blocks")
@Getter
@Setter
@NoArgsConstructor
public class GuideBlock extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "day_id", nullable = false)
    private GuideDay day;

    @Column(name = "position", nullable = false)
    private int position;

    @Column(name = "title", length = 200)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "block_type", nullable = false, length = 50)
    private String blockType = "ACTIVITY";

    @Column(name = "block_category", nullable = false, length = 30)
    private String blockCategory = "ACTIVITY";

    @Column(name = "suggested_start_minute")
    private Integer suggestedStartMinute;

    @Column(name = "suggested_duration_minutes")
    private Integer suggestedDurationMinutes;

    @OneToMany(mappedBy = "block", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position ASC")
    @BatchSize(size = 50)
    private List<GuidePlace> places = new ArrayList<>();

    public GuideBlock(GuideDay day, int position) {
        this.day = day;
        this.position = position;
    }
}
