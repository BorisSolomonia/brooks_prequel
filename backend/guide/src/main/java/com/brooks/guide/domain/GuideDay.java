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
@Table(name = "guide_days")
@Getter
@Setter
@NoArgsConstructor
public class GuideDay extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "guide_id", nullable = false)
    private Guide guide;

    @Column(name = "day_number", nullable = false)
    private int dayNumber;

    @Column(name = "title", length = 200)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @OneToMany(mappedBy = "day", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position ASC")
    @BatchSize(size = 50)
    private List<GuideBlock> blocks = new ArrayList<>();

    public GuideDay(Guide guide, int dayNumber) {
        this.guide = guide;
        this.dayNumber = dayNumber;
    }
}
