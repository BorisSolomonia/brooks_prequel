package com.brooks.app.api;

import com.brooks.common.exception.BusinessException;
import com.brooks.guide.dto.GuideCheckoutSessionResponse;
import com.brooks.guide.dto.GuideGiftRequest;
import com.brooks.guide.service.GuidePurchaseService;
import com.brooks.social.dto.FollowerSummaryResponse;
import com.brooks.social.repository.FollowRepository;
import com.brooks.social.service.FollowService;
import com.brooks.user.domain.User;
import com.brooks.user.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class GuideGiftController {

    private final GuidePurchaseService guidePurchaseService;
    private final FollowService followService;
    private final FollowRepository followRepository;
    private final UserService userService;

    @PostMapping("/guides/{guideId}/gift")
    public ResponseEntity<GuideCheckoutSessionResponse> giftGuide(
            Authentication authentication,
            @PathVariable UUID guideId,
            @Valid @RequestBody GuideGiftRequest request) {

        String subject = subject(authentication);
        String email = email(authentication);
        User creator = userService.findByAuth0Subject(subject);
        UUID recipientId = request.getRecipientUserId();

        if (creator.getId().equals(recipientId)) {
            throw new BusinessException("Cannot gift a guide to yourself");
        }
        if (!followRepository.existsByFollowerIdAndFollowingId(recipientId, creator.getId())) {
            throw new BusinessException("Recipient is not a follower");
        }

        return ResponseEntity.ok(guidePurchaseService.giftGuide(subject, email, guideId, recipientId));
    }

    @GetMapping("/me/followers")
    public ResponseEntity<List<FollowerSummaryResponse>> getMyFollowers(Authentication authentication) {
        return ResponseEntity.ok(followService.getMyFollowers(subject(authentication)));
    }

    private String subject(Authentication authentication) {
        return ((Jwt) authentication.getPrincipal()).getSubject();
    }

    private String email(Authentication authentication) {
        Object claim = ((Jwt) authentication.getPrincipal()).getClaims().get("email");
        return claim instanceof String s ? s : "";
    }
}
