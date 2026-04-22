package com.brooks.app.bootstrap;

import com.brooks.app.config.ExampleSeedProperties;
import com.brooks.guide.domain.*;
import com.brooks.guide.repository.GuideDayRepository;
import com.brooks.guide.repository.GuideRepository;
import com.brooks.guide.repository.GuideTagRepository;
import com.brooks.guide.repository.GuideVersionRepository;
import com.brooks.profile.domain.UserProfile;
import com.brooks.profile.repository.UserProfileRepository;
import com.brooks.user.domain.User;
import com.brooks.user.domain.UserStatus;
import com.brooks.user.repository.UserRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class ExampleCreatorSeedRunner implements ApplicationRunner {

    private final ExampleSeedProperties properties;
    private final UserRepository userRepository;
    private final UserProfileRepository profileRepository;
    private final GuideRepository guideRepository;
    private final GuideDayRepository guideDayRepository;
    private final GuideTagRepository guideTagRepository;
    private final GuideVersionRepository guideVersionRepository;
    private final TransactionTemplate transactionTemplate;
    private final ObjectMapper objectMapper;

    @Override
    public void run(ApplicationArguments args) {
        properties.validate();
        if (!properties.isEnabled()) {
            log.info("Example creator seed is disabled");
            return;
        }

        transactionTemplate.executeWithoutResult(status -> seedExampleCreator());
    }

    private void seedExampleCreator() {
        User user = userRepository.findByAuth0Subject(properties.getAuth0Subject())
                .or(() -> userRepository.findByEmail(properties.getEmail()))
                .orElse(null);
        if (user == null) {
            user = new User(properties.getAuth0Subject(), properties.getEmail());
        }

        user.setAuth0Subject(properties.getAuth0Subject());
        user.setEmail(properties.getEmail());
        user.setUsername(properties.getUsername());
        user.setStatus(UserStatus.ACTIVE);
        user.setOnboardingCompleted(true);
        user = userRepository.save(user);

        UserProfile profile = profileRepository.findByUserId(user.getId())
                .orElse(null);
        if (profile == null) {
            profile = new UserProfile(user.getId());
        }

        profile.setDisplayName(properties.getDisplayName());
        profile.setBio(properties.getBio());
        profile.setAvatarUrl(properties.getAvatarUrl());
        profile.setRegion(properties.getRegion());
        profile.setInterests(properties.getInterests());
        profile.setLatitude(properties.getLatitude());
        profile.setLongitude(properties.getLongitude());
        profile.setFollowerCount(properties.getFollowerCount());
        profile.setFollowingCount(properties.getFollowingCount());
        profile.setGuideCount(1);
        profile.setVerified(Boolean.TRUE.equals(properties.getVerified()));
        profileRepository.save(profile);

        Guide guide = guideRepository.findFirstByCreatorIdOrderByCreatedAtAsc(user.getId())
                .orElse(null);
        if (guide == null) {
            guide = new Guide(user.getId(), properties.getGuideTitle());
        }

        guide.setCreatorId(user.getId());
        guide.setTitle(properties.getGuideTitle());
        guide.setDescription(properties.getGuideSummary());
        guide.setCoverImageUrl(properties.getGuideCoverImageUrl());
        guide.setRegion(properties.getRegion());
        guide.setPrimaryCity(properties.getGuideCity());
        guide.setCountry(properties.getGuideCountry());
        guide.setPriceCents(properties.getGuidePriceCents());
        guide.setCurrency(properties.getGuideCurrency());
        boolean existingGuide = guide.getId() != null;
        guide.setStatus(GuideStatus.PUBLISHED);
        if (existingGuide) {
            guide = guideRepository.save(guide);
            log.info("Example creator '{}' already has guide '{}'; keeping existing itinerary content", user.getUsername(), guide.getTitle());
            return;
        }

        guide.setVersionNumber(1);
        guide.setDayCount(1);
        guide.setPlaceCount(1);

        List<GuideTag> seededTags = new ArrayList<>();
        Guide guideForTags = guide;
        for (String rawTag : properties.getGuideTags()) {
            String tag = rawTag == null ? "" : rawTag.trim();
            if (tag.isEmpty()) {
                continue;
            }
            boolean exists = seededTags.stream().anyMatch(existing -> existing.getTag().equals(tag));
            if (!exists) {
                seededTags.add(new GuideTag(guideForTags, tag));
            }
        }

        GuideDay day = new GuideDay(guide, 1);
        day.setTitle(properties.getDayTitle());
        day.setDescription(properties.getDayDescription());

        GuideBlock block = new GuideBlock(day, 1);
        block.setTitle(properties.getBlockTitle());
        block.setDescription(properties.getBlockDescription());
        block.setBlockType(properties.getBlockType());

        GuidePlace place = new GuidePlace(block, 1, properties.getPlaceName());
        place.setDescription(properties.getPlaceDescription());
        place.setAddress(properties.getPlaceAddress());
        place.setLatitude(properties.resolvedPlaceLatitude());
        place.setLongitude(properties.resolvedPlaceLongitude());
        place.setCategory(properties.getPlaceCategory());
        place.setPriceLevel(properties.getPlacePriceLevel());
        place.getImages().add(new GuidePlaceImage(place, properties.getPlaceImageUrl(), 0));

        block.getPlaces().add(place);
        day.getBlocks().add(block);

        for (GuideTag tag : seededTags) {
            guide.getTags().add(tag);
        }
        guide.getDays().add(day);

        guide = guideRepository.save(guide);

        String snapshot = serializeSnapshot(guide, user, profile, seededTags, List.of(day));
        GuideVersion version = guideVersionRepository.findByGuideIdAndVersionNumber(guide.getId(), 1)
                .orElse(null);
        if (version == null) {
            version = new GuideVersion(guide.getId(), 1, snapshot);
        }
        version.setGuideId(guide.getId());
        version.setVersionNumber(1);
        version.setSnapshot(snapshot);
        guideVersionRepository.save(version);

        log.info("Seeded example creator '{}' with guide '{}'", user.getUsername(), guide.getTitle());
    }

    private String serializeSnapshot(
            Guide guide,
            User user,
            UserProfile profile,
            List<GuideTag> tags,
            List<GuideDay> days) {
        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("id", guide.getId());
        snapshot.put("creatorId", guide.getCreatorId());
        snapshot.put("creatorUsername", user.getUsername());
        snapshot.put("creatorDisplayName", profile.getDisplayName());
        snapshot.put("title", guide.getTitle());
        snapshot.put("description", guide.getDescription());
        snapshot.put("coverImageUrl", guide.getCoverImageUrl());
        snapshot.put("region", guide.getRegion());
        snapshot.put("primaryCity", guide.getPrimaryCity());
        snapshot.put("country", guide.getCountry());
        snapshot.put("priceCents", guide.getPriceCents());
        snapshot.put("currency", guide.getCurrency());
        snapshot.put("status", guide.getStatus().name());
        snapshot.put("versionNumber", guide.getVersionNumber());
        snapshot.put("dayCount", guide.getDayCount());
        snapshot.put("placeCount", guide.getPlaceCount());
        snapshot.put("tags", tags.stream().map(GuideTag::getTag).toList());
        snapshot.put("days", days.stream().map(this::toSnapshotDay).toList());
        snapshot.put("generatedAt", Instant.now());

        try {
            return objectMapper.writeValueAsString(snapshot);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Failed to serialize example guide snapshot", exception);
        }
    }

    private Map<String, Object> toSnapshotDay(GuideDay day) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("id", day.getId());
        data.put("dayNumber", day.getDayNumber());
        data.put("title", day.getTitle());
        data.put("description", day.getDescription());
        data.put("blocks", day.getBlocks().stream().map(this::toSnapshotBlock).toList());
        return data;
    }

    private Map<String, Object> toSnapshotBlock(GuideBlock block) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("id", block.getId());
        data.put("position", block.getPosition());
        data.put("title", block.getTitle());
        data.put("description", block.getDescription());
        data.put("blockType", block.getBlockType());
        data.put("places", block.getPlaces().stream().map(this::toSnapshotPlace).toList());
        return data;
    }

    private Map<String, Object> toSnapshotPlace(GuidePlace place) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("id", place.getId());
        data.put("position", place.getPosition());
        data.put("name", place.getName());
        data.put("description", place.getDescription());
        data.put("address", place.getAddress());
        data.put("latitude", place.getLatitude());
        data.put("longitude", place.getLongitude());
        data.put("category", place.getCategory());
        data.put("priceLevel", place.getPriceLevel());
        data.put("images", place.getImages().stream().map(this::toSnapshotImage).toList());
        return data;
    }

    private Map<String, Object> toSnapshotImage(GuidePlaceImage image) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("id", image.getId());
        data.put("imageUrl", image.getImageUrl());
        data.put("caption", image.getCaption());
        data.put("position", image.getPosition());
        return data;
    }
}
