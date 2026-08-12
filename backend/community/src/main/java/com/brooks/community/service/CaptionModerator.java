package com.brooks.community.service;

import com.brooks.common.exception.BusinessException;
import org.springframework.stereotype.Component;

import java.util.regex.Pattern;

/**
 * Automated, synchronous, pre-publish caption moderation (design Q5 = automated only, no human
 * queue at launch). Also enforces the RedTeam §9.1 person-targeting guard on free text: a caption
 * may not embed an @handle, phone number, or email — the vectors used to dox or point a crowd at
 * a named individual. Deliberately conservative; a human queue is a documented later option.
 */
@Component
public class CaptionModerator {

    private static final Pattern HANDLE = Pattern.compile("@[A-Za-z0-9_]{2,}");
    private static final Pattern PHONE = Pattern.compile("(?:\\+?\\d[\\s-]?){7,}");
    private static final Pattern EMAIL = Pattern.compile("[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}");

    /**
     * Returns the trimmed caption if acceptable (null/blank passes through as null), or throws
     * {@link BusinessException} describing why it was rejected.
     */
    public String moderate(String caption) {
        if (caption == null || caption.isBlank()) {
            return null;
        }
        String trimmed = caption.trim();
        if (EMAIL.matcher(trimmed).find()) {
            throw new BusinessException("Captions can't contain email addresses.");
        }
        // Check email before handle so a full email isn't misread as a bare @handle.
        if (HANDLE.matcher(trimmed).find()) {
            throw new BusinessException("Captions can't tag or name a specific person (@handles aren't allowed).");
        }
        if (PHONE.matcher(trimmed).find()) {
            throw new BusinessException("Captions can't contain phone numbers.");
        }
        return trimmed;
    }
}
