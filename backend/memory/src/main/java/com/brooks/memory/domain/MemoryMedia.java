package com.brooks.memory.domain;

import com.brooks.common.domain.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "memory_media")
@Getter
@Setter
@NoArgsConstructor
public class MemoryMedia extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "memory_id", nullable = false)
    private Memory memory;

    @Enumerated(EnumType.STRING)
    @Column(name = "media_type", nullable = false, length = 20)
    private MemoryMediaType mediaType;

    @Column(name = "url", nullable = false, length = 700)
    private String url;

    @Column(name = "object_name", length = 700)
    private String objectName;

    @Column(name = "content_type", length = 120)
    private String contentType;

    @Column(name = "size_bytes")
    private Long sizeBytes;

    @Column(name = "position", nullable = false)
    private int position;

    public MemoryMedia(Memory memory, MemoryMediaType mediaType, String url, int position) {
        this.memory = memory;
        this.mediaType = mediaType;
        this.url = url;
        this.position = position;
    }
}
