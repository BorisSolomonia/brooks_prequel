package com.brooks.common.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;

@Getter
@AllArgsConstructor
public class PageResponse<T> {
    private List<T> content;
    private int page;
    private int size;
    private long totalElements;
    private int totalPages;
    private boolean last;

    /**
     * Build a PageResponse from raw paging inputs. Handles the empty-result case (totalPages=0
     * means we are always on the last page) so callers don't reinvent the math each time.
     */
    public static <T> PageResponse<T> of(List<T> content, int page, int size, long totalElements) {
        int totalPages = size <= 0 ? 0 : (int) Math.ceil((double) totalElements / size);
        boolean last = totalPages == 0 || page >= totalPages - 1;
        return new PageResponse<>(content, page, size, totalElements, totalPages, last);
    }

    public static <T> PageResponse<T> empty(int page, int size) {
        return new PageResponse<>(List.of(), page, size, 0L, 0, true);
    }
}
