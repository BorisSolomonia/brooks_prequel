package com.brooks.common.util;

/**
 * Bound the {@code size} and {@code page} query params so a single request can't pull a
 * full table into memory. Default cap is {@link BusinessConstants#MAX_PAGE_SIZE} (100).
 */
public final class Pagination {

    private Pagination() {}

    public static int clampSize(int size) {
        return clampSize(size, BusinessConstants.MAX_PAGE_SIZE);
    }

    public static int clampSize(int size, int max) {
        if (size < 1) return 1;
        return Math.min(size, max);
    }

    public static int clampPage(int page) {
        return Math.max(page, 0);
    }
}
