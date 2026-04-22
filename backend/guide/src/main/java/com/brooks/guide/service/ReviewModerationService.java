package com.brooks.guide.service;

import com.brooks.common.exception.BusinessException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

@Service
public class ReviewModerationService {

    public static final int REVIEW_TEXT_LIMIT = 250;

    private static final List<Pattern> BLOCKED_PATTERNS = List.of(
            Pattern.compile("\\b(?:fuck|fucking|shit|bitch|asshole|bastard|cunt)\\b"),
            Pattern.compile("\\b(?:nigger|faggot|retard|whore|slut)\\b")
    );

    public String normalizeReviewText(String input) {
        if (input == null) {
            return null;
        }

        String normalized = input.replace("\r\n", "\n").trim();
        if (normalized.isBlank()) {
            return null;
        }
        if (normalized.length() > REVIEW_TEXT_LIMIT) {
            throw new BusinessException("Review text must be 250 characters or fewer");
        }
        String lowered = normalized.toLowerCase(Locale.ROOT);
        boolean abusive = BLOCKED_PATTERNS.stream().anyMatch(pattern -> pattern.matcher(lowered).find());
        if (abusive) {
            throw new BusinessException("Review contains language that is not allowed");
        }
        return normalized;
    }
}
