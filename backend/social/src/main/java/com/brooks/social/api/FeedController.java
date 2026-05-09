package com.brooks.social.api;

import com.brooks.common.dto.PageResponse;
import com.brooks.common.util.BusinessConstants;
import com.brooks.common.util.Pagination;
import com.brooks.social.dto.FeedItemResponse;
import com.brooks.social.service.FeedService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/feed")
@RequiredArgsConstructor
public class FeedController {

    private final FeedService feedService;

    @GetMapping
    public ResponseEntity<PageResponse<FeedItemResponse>> getFeed(
            Authentication authentication,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "" + BusinessConstants.DEFAULT_PAGE_SIZE) int size) {
        String subject = ((Jwt) authentication.getPrincipal()).getSubject();
        return ResponseEntity.ok(feedService.getFeed(
                subject, Pagination.clampPage(page), Pagination.clampSize(size)));
    }
}
