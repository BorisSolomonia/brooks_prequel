package com.brooks.guide.service;

import com.brooks.profile.domain.UserProfile;
import com.brooks.profile.repository.UserProfileRepository;
import com.brooks.user.domain.User;
import com.brooks.user.service.UserService;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.*;

@Component
@RequiredArgsConstructor
public class ReviewAuthorViewResolver {

    private final UserService userService;
    private final UserProfileRepository userProfileRepository;

    public Map<UUID, ReviewAuthorView> resolve(Collection<UUID> userIds) {
        Set<UUID> uniqueIds = new HashSet<>(userIds);
        if (uniqueIds.isEmpty()) {
            return Map.of();
        }

        Map<UUID, User> users = userService.findAllByIds(uniqueIds);
        Map<UUID, UserProfile> profiles = new HashMap<>();
        for (UserProfile profile : userProfileRepository.findAllByUserIdIn(uniqueIds)) {
            profiles.put(profile.getUserId(), profile);
        }

        Map<UUID, ReviewAuthorView> result = new HashMap<>();
        for (UUID userId : uniqueIds) {
            User user = users.get(userId);
            if (user == null) {
                continue;
            }
            UserProfile profile = profiles.get(userId);
            String displayName = profile != null && profile.getDisplayName() != null && !profile.getDisplayName().isBlank()
                    ? profile.getDisplayName()
                    : (user.getUsername() != null ? user.getUsername() : "Traveler");
            result.put(userId, new ReviewAuthorView(
                    userId,
                    user.getUsername(),
                    displayName,
                    profile != null ? profile.getAvatarUrl() : null
            ));
        }
        return result;
    }

    @Getter
    public static class ReviewAuthorView {
        private final UUID userId;
        private final String username;
        private final String displayName;
        private final String avatarUrl;

        public ReviewAuthorView(UUID userId, String username, String displayName, String avatarUrl) {
            this.userId = userId;
            this.username = username;
            this.displayName = displayName;
            this.avatarUrl = avatarUrl;
        }
    }
}
