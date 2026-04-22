package com.brooks.guide.security;

import com.brooks.guide.domain.Guide;
import com.brooks.guide.repository.GuideRepository;
import com.brooks.user.domain.User;
import com.brooks.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

@Component("guideAuthz")
@RequiredArgsConstructor
public class GuideAuthz {

    private final GuideRepository guideRepository;
    private final UserService userService;

    @Transactional(readOnly = true)
    public boolean canEdit(Authentication authentication, UUID guideId) {
        if (authentication == null || !(authentication.getPrincipal() instanceof Jwt jwt) || guideId == null) {
            return false;
        }
        Optional<User> userOpt = userService.findOptionalByAuth0Subject(jwt.getSubject());
        if (userOpt.isEmpty()) {
            return false;
        }
        Optional<Guide> guideOpt = guideRepository.findById(guideId);
        if (guideOpt.isEmpty()) {
            return false;
        }
        return guideOpt.get().getCreatorId().equals(userOpt.get().getId());
    }
}
