package com.brooks.guide.service;

import com.brooks.common.dto.PageResponse;
import com.brooks.common.exception.BusinessException;
import com.brooks.common.exception.ResourceNotFoundException;
import com.brooks.guide.domain.*;
import com.brooks.guide.dto.*;
import com.brooks.guide.event.GuidePublishedEvent;
import com.brooks.guide.repository.*;
import com.brooks.profile.repository.UserProfileRepository;
import com.brooks.user.domain.User;
import com.brooks.user.service.UserService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.hibernate.Hibernate;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GuideService {

    private static final int WEEKLY_PURCHASE_WEIGHT = 2;
    private static final int POPULAR_THIS_WEEK_THRESHOLD = 5;

    private final GuideRepository guideRepository;
    private final GuideDayRepository dayRepository;
    private final GuideBlockRepository blockRepository;
    private final GuidePlaceRepository placeRepository;
    private final GuideTagRepository tagRepository;
    private final GuideVersionRepository versionRepository;
    private final SavedGuideRepository savedGuideRepository;
    private final UserProfileRepository profileRepository;
    private final GuidePurchaseRepository purchaseRepository;
    private final GuideReviewRepository reviewRepository;
    private final UserService userService;
    private final ObjectMapper objectMapper;
    private final ApplicationEventPublisher eventPublisher;

    // ── Guide CRUD ──────────────────────────────────────────────

    @Transactional
    public GuideResponse createGuide(String auth0Subject, GuideCreateRequest request) {
        User user = userService.findByAuth0Subject(auth0Subject);
        Guide guide = new Guide(user.getId(), request.getTitle());
        guide.setDescription(request.getDescription());
        guide.setCoverImageUrl(request.getCoverImageUrl());
        guide.setRegion(request.getRegion());
        guide.setPrimaryCity(request.getPrimaryCity());
        guide.setCountry(request.getCountry());
        guide.setTimezone(request.getTimezone());
        guide.setPriceCents(request.getPriceCents());
        if (request.getCurrency() != null) guide.setCurrency(request.getCurrency());

        guide = guideRepository.save(guide);
        replaceTags(guide, request.getTags());
        return toFullResponse(guide);
    }

    @Transactional(readOnly = true)
    public GuideResponse getGuide(String auth0Subject, UUID guideId) {
        findOwnedGuide(auth0Subject, guideId);
        Guide guide = loadGuideForFullResponse(guideId);

        return toFullResponse(guide);
    }

    @Transactional
    @CacheEvict(value = "guidePreviews", key = "#guideId")
    public GuideResponse updateGuide(String auth0Subject, UUID guideId, GuideUpdateRequest request) {
        Guide guide = findOwnedGuide(auth0Subject, guideId);

        if (request.getTitle() != null) guide.setTitle(request.getTitle());
        if (request.getDescription() != null) guide.setDescription(request.getDescription());
        if (request.getCoverImageUrl() != null) guide.setCoverImageUrl(request.getCoverImageUrl());
        if (request.getRegion() != null) guide.setRegion(request.getRegion());
        if (request.getPrimaryCity() != null) guide.setPrimaryCity(request.getPrimaryCity());
        if (request.getCountry() != null) guide.setCountry(request.getCountry());
        if (request.getTimezone() != null) guide.setTimezone(request.getTimezone());
        if (request.getPriceCents() != null) guide.setPriceCents(request.getPriceCents());
        if (request.getCurrency() != null) guide.setCurrency(request.getCurrency());
        if (request.getSalePriceCents() != null) {
            guide.setSalePriceCents(request.getSalePriceCents() == 0 ? null : request.getSalePriceCents());
            guide.setSaleEndsAt(request.getSalePriceCents() == 0 ? null : request.getSaleEndsAt());
        }
        if (request.getTags() != null) replaceTags(guide, request.getTags());
        if (request.getSortOrder() != null) guide.setSortOrder(request.getSortOrder());
        if (request.getBestSeasonStartMonth() != null) guide.setBestSeasonStartMonth(request.getBestSeasonStartMonth());
        if (request.getBestSeasonEndMonth() != null) guide.setBestSeasonEndMonth(request.getBestSeasonEndMonth());
        if (request.getBestSeasonLabel() != null) guide.setBestSeasonLabel(request.getBestSeasonLabel().isBlank() ? null : request.getBestSeasonLabel());
        if (request.getTravelerStage() != null) guide.setTravelerStage(request.getTravelerStage().isBlank() ? null : request.getTravelerStage());
        if (request.getPersonas() != null) {
            guide.getPersonas().clear();
            guide.getPersonas().addAll(request.getPersonas());
        }
        if (request.getLatitude() != null) guide.setLatitude(request.getLatitude());
        if (request.getLongitude() != null) guide.setLongitude(request.getLongitude());

        return toFullResponse(guide);
    }

    @Transactional
    @CacheEvict(value = "guidePreviews", key = "#guideId")
    public void deleteGuide(String auth0Subject, UUID guideId) {
        Guide guide = findOwnedGuide(auth0Subject, guideId);
        boolean wasPublished = guide.getStatus() == GuideStatus.PUBLISHED;
        guide.setStatus(GuideStatus.DELETED);

        if (wasPublished) {
            profileRepository.findByUserId(guide.getCreatorId())
                    .ifPresent(p -> p.setGuideCount(Math.max(0, p.getGuideCount() - 1)));
        }
    }

    // ── Day CRUD ────────────────────────────────────────────────

    @Transactional
    public GuideDayResponse addDay(String auth0Subject, UUID guideId, GuideDayRequest request) {
        Guide guide = findOwnedGuide(auth0Subject, guideId);
        int nextNumber = dayRepository.countByGuideId(guideId) + 1;
        GuideDay day = new GuideDay(guide, nextNumber);
        day.setTitle(request.getTitle());
        day.setDescription(request.getDescription());
        day = dayRepository.save(day);
        guide.setDayCount(nextNumber);
        return toDayResponse(day);
    }

    @Transactional
    public GuideDayResponse updateDay(String auth0Subject, UUID guideId, UUID dayId, GuideDayRequest request) {
        findOwnedGuide(auth0Subject, guideId);
        GuideDay day = findGuideDay(guideId, dayId);
        if (request.getTitle() != null) day.setTitle(request.getTitle());
        if (request.getDescription() != null) day.setDescription(request.getDescription());
        return toDayResponse(day);
    }

    @Transactional
    public void deleteDay(String auth0Subject, UUID guideId, UUID dayId) {
        Guide guide = findOwnedGuide(auth0Subject, guideId);
        GuideDay day = findGuideDay(guideId, dayId);

        // Count places being removed
        int placesRemoved = day.getBlocks().stream()
                .mapToInt(b -> b.getPlaces().size())
                .sum();

        dayRepository.delete(day);

        // Re-number remaining days
        List<GuideDay> remaining = dayRepository.findByGuideIdOrderByDayNumberAsc(guideId);
        for (int i = 0; i < remaining.size(); i++) {
            remaining.get(i).setDayNumber(i + 1);
        }
        guide.setDayCount(remaining.size());
        guide.setPlaceCount(Math.max(0, guide.getPlaceCount() - placesRemoved));
    }

    // ── Block CRUD ──────────────────────────────────────────────

    @Transactional
    public GuideBlockResponse addBlock(String auth0Subject, UUID guideId, UUID dayId, GuideBlockRequest request) {
        findOwnedGuide(auth0Subject, guideId);
        GuideDay day = findGuideDay(guideId, dayId);
        int nextPosition = blockRepository.countByDayId(dayId) + 1;
        GuideBlock block = new GuideBlock(day, nextPosition);
        block.setTitle(request.getTitle());
        block.setDescription(request.getDescription());
        if (request.getBlockType() != null) block.setBlockType(request.getBlockType());
        if (request.getBlockCategory() != null) block.setBlockCategory(request.getBlockCategory());
        block.setSuggestedStartMinute(request.getSuggestedStartMinute());
        block = blockRepository.save(block);
        return toBlockResponse(block);
    }

    @Transactional
    public GuideBlockResponse updateBlock(String auth0Subject, UUID guideId, UUID blockId, GuideBlockRequest request) {
        findOwnedGuide(auth0Subject, guideId);
        GuideBlock block = findGuideBlock(guideId, blockId);
        if (request.getTitle() != null) block.setTitle(request.getTitle());
        if (request.getDescription() != null) block.setDescription(request.getDescription());
        if (request.getBlockType() != null) block.setBlockType(request.getBlockType());
        if (request.getBlockCategory() != null) block.setBlockCategory(request.getBlockCategory());
        block.setSuggestedStartMinute(request.getSuggestedStartMinute());
        return toBlockResponse(block);
    }

    @Transactional
    public void deleteBlock(String auth0Subject, UUID guideId, UUID dayId, UUID blockId) {
        Guide guide = findOwnedGuide(auth0Subject, guideId);
        findGuideDay(guideId, dayId);
        GuideBlock block = blockRepository.findByIdAndDayId(blockId, dayId)
                .orElseThrow(() -> new ResourceNotFoundException("Block", blockId));
        int placesRemoved = block.getPlaces().size();
        blockRepository.delete(block);

        // Re-number remaining blocks
        List<GuideBlock> remaining = blockRepository.findByDayIdOrderByPositionAsc(dayId);
        for (int i = 0; i < remaining.size(); i++) {
            remaining.get(i).setPosition(i + 1);
        }
        guide.setPlaceCount(Math.max(0, guide.getPlaceCount() - placesRemoved));
    }

    // ── Place CRUD ──────────────────────────────────────────────

    @Transactional
    public GuidePlaceResponse addPlace(String auth0Subject, UUID guideId, UUID blockId, GuidePlaceRequest request) {
        Guide guide = findOwnedGuide(auth0Subject, guideId);
        GuideBlock block = findGuideBlock(guideId, blockId);
        int nextPosition = placeRepository.countByBlockId(blockId) + 1;

        GuidePlace place = new GuidePlace(block, nextPosition, request.getName());
        place.setDescription(request.getDescription());
        place.setAddress(request.getAddress());
        place.setLatitude(request.getLatitude());
        place.setLongitude(request.getLongitude());
        place.setGooglePlaceId(request.getGooglePlaceId());
        place.setCategory(request.getCategory());
        place.setPriceLevel(request.getPriceLevel());
        place.setSuggestedStartMinute(request.getSuggestedStartMinute());
        place.setSuggestedDurationMinutes(request.getSuggestedDurationMinutes());
        place.setSponsored(request.isSponsored());
        place = placeRepository.save(place);

        if (request.getImageUrls() != null) {
            int maxImages = Math.min(request.getImageUrls().size(), 4);
            for (int i = 0; i < maxImages; i++) {
                place.getImages().add(new GuidePlaceImage(place, request.getImageUrls().get(i), i));
            }
            placeRepository.save(place);
        }

        guide.setPlaceCount(guide.getPlaceCount() + 1);
        return toPlaceResponse(place);
    }

    @Transactional
    public GuidePlaceResponse updatePlace(String auth0Subject, UUID guideId, UUID placeId, GuidePlaceRequest request) {
        findOwnedGuide(auth0Subject, guideId);
        GuidePlace place = findGuidePlace(guideId, placeId);

        if (request.getName() != null) place.setName(request.getName());
        if (request.getDescription() != null) place.setDescription(request.getDescription());
        if (request.getAddress() != null) place.setAddress(request.getAddress());
        if (request.getLatitude() != null) place.setLatitude(request.getLatitude());
        if (request.getLongitude() != null) place.setLongitude(request.getLongitude());
        if (request.getGooglePlaceId() != null) place.setGooglePlaceId(request.getGooglePlaceId());
        if (request.getCategory() != null) place.setCategory(request.getCategory());
        if (request.getPriceLevel() != null) place.setPriceLevel(request.getPriceLevel());
        place.setSuggestedStartMinute(request.getSuggestedStartMinute());
        place.setSuggestedDurationMinutes(request.getSuggestedDurationMinutes());
        place.setSponsored(request.isSponsored());

        if (request.getImageUrls() != null) {
            place.getImages().clear();
            int maxImages = Math.min(request.getImageUrls().size(), 4);
            for (int i = 0; i < maxImages; i++) {
                place.getImages().add(new GuidePlaceImage(place, request.getImageUrls().get(i), i));
            }
        }

        return toPlaceResponse(place);
    }

    @Transactional
    public void deletePlace(String auth0Subject, UUID guideId, UUID blockId, UUID placeId) {
        Guide guide = findOwnedGuide(auth0Subject, guideId);
        findGuideBlock(guideId, blockId);
        GuidePlace place = placeRepository.findByIdAndBlockId(placeId, blockId)
                .orElseThrow(() -> new ResourceNotFoundException("Place", placeId));
        placeRepository.delete(place);

        // Re-number remaining places
        List<GuidePlace> remaining = placeRepository.findByBlockIdOrderByPositionAsc(blockId);
        for (int i = 0; i < remaining.size(); i++) {
            remaining.get(i).setPosition(i + 1);
        }
        guide.setPlaceCount(Math.max(0, guide.getPlaceCount() - 1));
    }

    // ── Publish ─────────────────────────────────────────────────

    @Transactional
    @CacheEvict(value = "guidePreviews", key = "#guideId")
    public GuideResponse publishGuide(String auth0Subject, UUID guideId) {
        Guide guide = findOwnedGuide(auth0Subject, guideId);

        if (guide.getDayCount() == 0) {
            throw new BusinessException("Guide must have at least one day to publish");
        }

        // Re-fetch with full tree for snapshot
        guide = loadGuideForFullResponse(guideId);

        boolean firstPublish = guide.getStatus() == GuideStatus.DRAFT;
        guide.setStatus(GuideStatus.PUBLISHED);
        guide.setVersionNumber(guide.getVersionNumber() + 1);

        // Create JSONB snapshot
        GuideResponse snapshot = toFullResponse(guide);
        try {
            String json = objectMapper.writeValueAsString(snapshot);
            versionRepository.save(new GuideVersion(guideId, guide.getVersionNumber(), json));
        } catch (JsonProcessingException e) {
            throw new BusinessException("Failed to create version snapshot");
        }

        if (firstPublish) {
            profileRepository.findByUserId(guide.getCreatorId())
                    .ifPresent(p -> p.setGuideCount(p.getGuideCount() + 1));
        }

        eventPublisher.publishEvent(new GuidePublishedEvent(
                guideId, guide.getCreatorId(), guide.getVersionNumber()));

        return toFullResponse(guide);
    }

    // ── Preview (public) ────────────────────────────────────────

    @Transactional(readOnly = true)
    @Cacheable(value = "guidePreviews", key = "#guideId")
    public GuidePreviewResponse getPreview(UUID guideId) {
        Guide guide = guideRepository.findById(guideId)
                .orElseThrow(() -> new ResourceNotFoundException("Guide", guideId));

        if (guide.getStatus() != GuideStatus.PUBLISHED) {
            throw new ResourceNotFoundException("Guide", guideId);
        }

        User creator = userService.findById(guide.getCreatorId());

        int purchaseCount = (int) purchaseRepository.countByGuideIdAndStatus(guideId, GuidePurchaseStatus.COMPLETED);
        double avgRating = reviewRepository.averageRatingByGuideId(guideId);
        int reviewCount = (int) reviewRepository.countByGuideId(guideId);

        List<GuidePreviewResponse.ReviewPreview> recentReviews = reviewRepository
                .findByGuideIdOrderByCreatedAtDesc(guideId, PageRequest.of(0, 5))
                .stream()
                .map(r -> GuidePreviewResponse.ReviewPreview.builder()
                        .rating(r.getRating())
                        .reviewText(r.getReviewText())
                        .createdAt(r.getCreatedAt())
                        .build())
                .toList();

        // Build Day 1 full preview + locked stubs for remaining days
        List<GuideDay> days = dayRepository.findByGuideIdOrderByDayNumberAsc(guideId);
        GuidePreviewResponse.DayPreview firstDayPreview = null;
        List<GuidePreviewResponse.LockedDayStub> lockedDays = new ArrayList<>();

        for (GuideDay day : days) {
            if (day.getDayNumber() == 1) {
                List<GuideBlock> blocks = blockRepository.findByDayIdOrderByPositionAsc(day.getId());
                List<GuidePreviewResponse.BlockPreview> blockPreviews = blocks.stream()
                    .filter(block -> !"SECRET".equals(block.getBlockCategory()))
                    .map(block -> {
                    List<GuidePlace> places = placeRepository.findByBlockIdOrderByPositionAsc(block.getId());
                    List<GuidePreviewResponse.PlacePreview> placePreviews = places.stream().map(place ->
                        GuidePreviewResponse.PlacePreview.builder()
                            .name(place.getName())
                            .address(place.getAddress())
                            .category(place.getCategory())
                            .priceLevel(place.getPriceLevel())
                            .suggestedStartMinute(place.getSuggestedStartMinute())
                            .suggestedDurationMinutes(place.getSuggestedDurationMinutes())
                            .latitude(place.getLatitude())
                            .longitude(place.getLongitude())
                            .build()
                    ).toList();
                    return GuidePreviewResponse.BlockPreview.builder()
                            .title(block.getTitle())
                            .description(block.getDescription())
                            .blockType(block.getBlockType())
                            .suggestedStartMinute(block.getSuggestedStartMinute())
                            .places(placePreviews)
                            .build();
                }).toList();
                firstDayPreview = GuidePreviewResponse.DayPreview.builder()
                        .dayNumber(1)
                        .title(day.getTitle())
                        .description(day.getDescription())
                        .blocks(blockPreviews)
                        .build();
            } else {
                lockedDays.add(GuidePreviewResponse.LockedDayStub.builder()
                        .dayNumber(day.getDayNumber())
                        .title(day.getTitle())
                        .build());
            }
        }

        return GuidePreviewResponse.builder()
                .id(guide.getId())
                .title(guide.getTitle())
                .coverImageUrl(guide.getCoverImageUrl())
                .dayCount(guide.getDayCount())
                .placeCount(guide.getPlaceCount())
                .priceCents(guide.getPriceCents())
                .salePriceCents(guide.getSalePriceCents())
                .saleEndsAt(guide.getSaleEndsAt())
                .effectivePriceCents(effectivePrice(guide))
                .currency(guide.getCurrency())
                .creatorId(guide.getCreatorId())
                .region(guide.getRegion())
                .primaryCity(guide.getPrimaryCity())
                .displayLocation(displayLocation(guide))
                .spotCount(guide.getPlaceCount())
                .creatorUsername(creator.getUsername())
                .purchaseCount(purchaseCount)
                .averageRating(avgRating)
                .reviewCount(reviewCount)
                .weeklyPopularityScore(weeklyPopularityScore(guide.getId()))
                .popularThisWeek(isPopularThisWeek(guide.getId()))
                .bestSeasonStartMonth(guide.getBestSeasonStartMonth())
                .bestSeasonEndMonth(guide.getBestSeasonEndMonth())
                .bestSeasonLabel(guide.getBestSeasonLabel())
                .firstDay(firstDayPreview)
                .lockedDays(lockedDays)
                .recentReviews(recentReviews)
                .build();
    }

    @Transactional(readOnly = true)
    public GuideSaveStatusResponse getSaveStatus(String auth0Subject, UUID guideId) {
        User user = userService.findByAuth0Subject(auth0Subject);
        return GuideSaveStatusResponse.builder()
                .saved(savedGuideRepository.existsByUserIdAndGuideId(user.getId(), guideId))
                .build();
    }

    @Transactional
    public GuideSaveStatusResponse saveGuide(String auth0Subject, UUID guideId) {
        User user = userService.findByAuth0Subject(auth0Subject);
        Guide guide = guideRepository.findById(guideId)
                .orElseThrow(() -> new ResourceNotFoundException("Guide", guideId));

        if (guide.getStatus() != GuideStatus.PUBLISHED) {
            throw new BusinessException("Only published guides can be saved");
        }
        if (guide.getCreatorId().equals(user.getId())) {
            throw new BusinessException("You cannot save your own guide");
        }

        savedGuideRepository.findByUserIdAndGuideId(user.getId(), guideId)
                .orElseGet(() -> savedGuideRepository.save(new SavedGuide(user.getId(), guideId)));

        return GuideSaveStatusResponse.builder().saved(true).build();
    }

    @Transactional
    public GuideSaveStatusResponse unsaveGuide(String auth0Subject, UUID guideId) {
        User user = userService.findByAuth0Subject(auth0Subject);
        savedGuideRepository.findByUserIdAndGuideId(user.getId(), guideId)
                .ifPresent(savedGuideRepository::delete);
        return GuideSaveStatusResponse.builder().saved(false).build();
    }

    // ── My Guides ───────────────────────────────────────────────

    @Transactional(readOnly = true)
    public PageResponse<GuideListItemResponse> getMyGuides(String auth0Subject, int page, int size) {
        User user = userService.findByAuth0Subject(auth0Subject);
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "updatedAt"));
        Page<Guide> guides = guideRepository.findByCreatorIdAndStatusNot(
                user.getId(), GuideStatus.DELETED, pageRequest);

        List<GuideListItemResponse> items = guides.getContent().stream()
                .map(this::toListItem)
                .toList();

        return new PageResponse<>(items, guides.getNumber(), guides.getSize(),
                guides.getTotalElements(), guides.getTotalPages(), guides.isLast());
    }

    @Transactional(readOnly = true)
    public GuideLibraryResponse getGuideLibrary(String auth0Subject) {
        User user = userService.findByAuth0Subject(auth0Subject);

        List<GuideLibraryItemResponse> created = guideRepository.findByCreatorIdAndStatusNot(
                        user.getId(), GuideStatus.DELETED, PageRequest.of(0, 100, Sort.by(Sort.Direction.DESC, "updatedAt")))
                .getContent()
                .stream()
                .map(this::toLibraryItemFromGuide)
                .toList();

        List<SavedGuide> savedEntries = savedGuideRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
        Map<UUID, Guide> savedGuides = guideRepository.findAllById(
                        savedEntries.stream().map(SavedGuide::getGuideId).toList())
                .stream()
                .collect(Collectors.toMap(Guide::getId, guide -> guide));

        List<GuideLibraryItemResponse> saved = savedEntries.stream()
                .map(savedEntry -> {
                    Guide guide = savedGuides.get(savedEntry.getGuideId());
                    if (guide == null || guide.getStatus() != GuideStatus.PUBLISHED) {
                        return null;
                    }
                    return GuideLibraryItemResponse.builder()
                            .id(guide.getId())
                            .title(guide.getTitle())
                            .coverImageUrl(guide.getCoverImageUrl())
                            .region(guide.getRegion())
                            .dayCount(guide.getDayCount())
                            .placeCount(guide.getPlaceCount())
                            .priceCents(guide.getPriceCents())
                            .salePriceCents(guide.getSalePriceCents())
                            .saleEndsAt(guide.getSaleEndsAt())
                            .effectivePriceCents(effectivePrice(guide))
                            .currency(guide.getCurrency())
                            .versionNumber(guide.getVersionNumber())
                            .savedAt(savedEntry.getCreatedAt())
                            .creatorUsername(userService.findById(guide.getCreatorId()).getUsername())
                            .displayLocation(displayLocation(guide))
                            .spotCount(guide.getPlaceCount())
                            .averageRating(reviewRepository.averageRatingByGuideId(guide.getId()))
                            .reviewCount((int) reviewRepository.countByGuideId(guide.getId()))
                            .weeklyPopularityScore(weeklyPopularityScore(guide.getId()))
                            .popularThisWeek(isPopularThisWeek(guide.getId()))
                            .savedByViewer(true)
                            .build();
                })
                .filter(Objects::nonNull)
                .toList();

        return GuideLibraryResponse.builder()
                .created(created)
                .saved(saved)
                .purchased(List.of())
                .build();
    }

    // ── Creator Guides (public) ────────────────────────────────

    @Transactional(readOnly = true)
    public PageResponse<GuideListItemResponse> getCreatorPublishedGuides(String username, int page, int size) {
        User user = userService.findByUsername(username);
        PageRequest pageRequest = PageRequest.of(page, size);
        Page<Guide> guides = guideRepository.findByCreatorIdAndStatusOrderBySortOrderAscUpdatedAtDesc(
                user.getId(), GuideStatus.PUBLISHED, pageRequest);

        List<GuideListItemResponse> items = guides.getContent().stream()
                .map(this::toListItem)
                .toList();

        return new PageResponse<>(items, guides.getNumber(), guides.getSize(),
                guides.getTotalElements(), guides.getTotalPages(), guides.isLast());
    }

    // ── Helpers ─────────────────────────────────────────────────

    // ── AI helpers (no auth check — callers must verify ownership first) ─────

    public void assertOwner(UUID userId, UUID guideId) {
        Guide guide = guideRepository.findById(guideId)
                .orElseThrow(() -> new ResourceNotFoundException("Guide", guideId));
        if (!guide.getCreatorId().equals(userId)) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN, "Not guide owner");
        }
    }

    @Transactional(readOnly = true)
    public GuideResponse getGuideContent(UUID guideId) {
        Guide guide = loadGuideForFullResponse(guideId);
        return toFullResponse(guide);
    }

    private Guide findOwnedGuide(String auth0Subject, UUID guideId) {
        User user = userService.findByAuth0Subject(auth0Subject);
        Guide guide = guideRepository.findById(guideId)
                .orElseThrow(() -> new ResourceNotFoundException("Guide", guideId));
        if (!guide.getCreatorId().equals(user.getId())) {
            throw new BusinessException("You do not own this guide");
        }
        if (guide.getStatus() == GuideStatus.DELETED) {
            throw new ResourceNotFoundException("Guide", guideId);
        }
        return guide;
    }

    private Guide loadGuideForFullResponse(UUID guideId) {
        Guide guide = guideRepository.findById(guideId)
                .orElseThrow(() -> new ResourceNotFoundException("Guide", guideId));

        // @BatchSize on each collection means these initialize calls fire
        // ~5 batch queries total regardless of guide depth, not N+1.
        Hibernate.initialize(guide.getPersonas());
        Hibernate.initialize(guide.getTags());
        Hibernate.initialize(guide.getDays());
        for (GuideDay day : guide.getDays()) {
            Hibernate.initialize(day.getBlocks());
            for (GuideBlock block : day.getBlocks()) {
                Hibernate.initialize(block.getPlaces());
                for (GuidePlace place : block.getPlaces()) {
                    Hibernate.initialize(place.getImages());
                }
            }
        }

        return guide;
    }

    private GuideDay findGuideDay(UUID guideId, UUID dayId) {
        return dayRepository.findByIdAndGuideId(dayId, guideId)
                .orElseThrow(() -> new ResourceNotFoundException("Day", dayId));
    }

    private GuideBlock findGuideBlock(UUID guideId, UUID blockId) {
        return blockRepository.findByIdAndDayGuideId(blockId, guideId)
                .orElseThrow(() -> new ResourceNotFoundException("Block", blockId));
    }

    private GuidePlace findGuidePlace(UUID guideId, UUID placeId) {
        return placeRepository.findByIdAndBlockDayGuideId(placeId, guideId)
                .orElseThrow(() -> new ResourceNotFoundException("Place", placeId));
    }

    private void replaceTags(Guide guide, List<String> tagNames) {
        // Bulk DELETE executes immediately (before the transaction's INSERT batch),
        // preventing the unique-constraint violation that occurs when Hibernate
        // tries to insert new tags before orphan-removal deletes the old ones.
        tagRepository.deleteByGuideId(guide.getId());
        guide.getTags().clear();
        if (tagNames != null) {
            tagNames.stream()
                    .distinct()
                    .forEach(t -> guide.getTags().add(new GuideTag(guide, t)));
        }
    }

    // ── Mappers ─────────────────────────────────────────────────

    private GuideResponse toFullResponse(Guide guide) {
        List<String> personas = List.copyOf(guide.getPersonas());
        List<String> tagNames = guide.getTags().stream()
                .map(GuideTag::getTag)
                .toList();

        List<GuideDayResponse> dayResponses = guide.getDays().stream()
                .map(this::toDayResponse)
                .toList();

        return GuideResponse.builder()
                .id(guide.getId())
                .creatorId(guide.getCreatorId())
                .title(guide.getTitle())
                .description(guide.getDescription())
                .coverImageUrl(guide.getCoverImageUrl())
                .region(guide.getRegion())
                .primaryCity(guide.getPrimaryCity())
                .country(guide.getCountry())
                .timezone(guide.getTimezone())
                .priceCents(guide.getPriceCents())
                .salePriceCents(guide.getSalePriceCents())
                .saleEndsAt(guide.getSaleEndsAt())
                .effectivePriceCents(effectivePrice(guide))
                .currency(guide.getCurrency())
                .status(guide.getStatus().name())
                .versionNumber(guide.getVersionNumber())
                .dayCount(guide.getDayCount())
                .placeCount(guide.getPlaceCount())
                .displayLocation(displayLocation(guide))
                .spotCount(guide.getPlaceCount())
                .averageRating(reviewRepository.averageRatingByGuideId(guide.getId()))
                .reviewCount((int) reviewRepository.countByGuideId(guide.getId()))
                .weeklyPopularityScore(weeklyPopularityScore(guide.getId()))
                .popularThisWeek(isPopularThisWeek(guide.getId()))
                .tags(tagNames)
                .days(dayResponses)
                .createdAt(guide.getCreatedAt())
                .updatedAt(guide.getUpdatedAt())
                .travelerStage(guide.getTravelerStage())
                .personas(personas)
                .bestSeasonStartMonth(guide.getBestSeasonStartMonth())
                .bestSeasonEndMonth(guide.getBestSeasonEndMonth())
                .bestSeasonLabel(guide.getBestSeasonLabel())
                .latitude(guide.getLatitude())
                .longitude(guide.getLongitude())
                .build();
    }

    private GuideDayResponse toDayResponse(GuideDay day) {
        List<GuideBlockResponse> blockResponses = day.getBlocks().stream()
                .map(this::toBlockResponse)
                .toList();

        return GuideDayResponse.builder()
                .id(day.getId())
                .dayNumber(day.getDayNumber())
                .title(day.getTitle())
                .description(day.getDescription())
                .blocks(blockResponses)
                .build();
    }

    private GuideBlockResponse toBlockResponse(GuideBlock block) {
        List<GuidePlaceResponse> placeResponses = block.getPlaces().stream()
                .map(this::toPlaceResponse)
                .toList();

        return GuideBlockResponse.builder()
                .id(block.getId())
                .position(block.getPosition())
                .title(block.getTitle())
                .description(block.getDescription())
                .blockType(block.getBlockType())
                .blockCategory(block.getBlockCategory())
                .suggestedStartMinute(block.getSuggestedStartMinute())
                .places(placeResponses)
                .build();
    }

    private GuidePlaceResponse toPlaceResponse(GuidePlace place) {
        List<GuidePlaceImageResponse> imageResponses = place.getImages().stream()
                .map(img -> GuidePlaceImageResponse.builder()
                        .id(img.getId())
                        .imageUrl(img.getImageUrl())
                        .caption(img.getCaption())
                        .position(img.getPosition())
                        .build())
                .toList();

        return GuidePlaceResponse.builder()
                .id(place.getId())
                .position(place.getPosition())
                .name(place.getName())
                .description(place.getDescription())
                .address(place.getAddress())
                .latitude(place.getLatitude())
                .longitude(place.getLongitude())
                .googlePlaceId(place.getGooglePlaceId())
                .category(place.getCategory())
                .priceLevel(place.getPriceLevel())
                .suggestedStartMinute(place.getSuggestedStartMinute())
                .suggestedDurationMinutes(place.getSuggestedDurationMinutes())
                .sponsored(place.isSponsored())
                .images(imageResponses)
                .build();
    }

    private GuideListItemResponse toListItem(Guide guide) {
        return GuideListItemResponse.builder()
                .id(guide.getId())
                .title(guide.getTitle())
                .coverImageUrl(guide.getCoverImageUrl())
                .region(guide.getRegion())
                .status(guide.getStatus().name())
                .dayCount(guide.getDayCount())
                .placeCount(guide.getPlaceCount())
                .priceCents(guide.getPriceCents())
                .salePriceCents(guide.getSalePriceCents())
                .saleEndsAt(guide.getSaleEndsAt())
                .effectivePriceCents(effectivePrice(guide))
                .currency(guide.getCurrency())
                .versionNumber(guide.getVersionNumber())
                .displayLocation(displayLocation(guide))
                .spotCount(guide.getPlaceCount())
                .averageRating(reviewRepository.averageRatingByGuideId(guide.getId()))
                .reviewCount((int) reviewRepository.countByGuideId(guide.getId()))
                .weeklyPopularityScore(weeklyPopularityScore(guide.getId()))
                .popularThisWeek(isPopularThisWeek(guide.getId()))
                .createdAt(guide.getCreatedAt())
                .updatedAt(guide.getUpdatedAt())
                .build();
    }

    private GuideLibraryItemResponse toLibraryItemFromGuide(Guide guide) {
        return GuideLibraryItemResponse.builder()
                .id(guide.getId())
                .title(guide.getTitle())
                .coverImageUrl(guide.getCoverImageUrl())
                .region(guide.getRegion())
                .dayCount(guide.getDayCount())
                .placeCount(guide.getPlaceCount())
                .priceCents(guide.getPriceCents())
                .salePriceCents(guide.getSalePriceCents())
                .saleEndsAt(guide.getSaleEndsAt())
                .effectivePriceCents(effectivePrice(guide))
                .currency(guide.getCurrency())
                .versionNumber(guide.getVersionNumber())
                .creatorUsername(userService.findById(guide.getCreatorId()).getUsername())
                .displayLocation(displayLocation(guide))
                .spotCount(guide.getPlaceCount())
                .averageRating(reviewRepository.averageRatingByGuideId(guide.getId()))
                .reviewCount((int) reviewRepository.countByGuideId(guide.getId()))
                .weeklyPopularityScore(weeklyPopularityScore(guide.getId()))
                .popularThisWeek(isPopularThisWeek(guide.getId()))
                .savedByViewer(false)
                .build();
    }

    private String displayLocation(Guide guide) {
        if (guide.getPrimaryCity() != null && !guide.getPrimaryCity().isBlank()) {
            return guide.getPrimaryCity();
        }
        if (guide.getRegion() != null && !guide.getRegion().isBlank()) {
            return guide.getRegion();
        }
        return guide.getCountry();
    }

    private int weeklyPopularityScore(UUID guideId) {
        Instant since = Instant.now().minus(7, ChronoUnit.DAYS);
        long weeklyPurchases = purchaseRepository.countByGuideIdAndStatusAndCreatedAtAfter(
                guideId, GuidePurchaseStatus.COMPLETED, since);
        long weeklySaves = savedGuideRepository.countByGuideIdAndCreatedAtAfter(guideId, since);
        return Math.toIntExact(Math.min(Integer.MAX_VALUE, weeklyPurchases * WEEKLY_PURCHASE_WEIGHT + weeklySaves));
    }

    private boolean isPopularThisWeek(UUID guideId) {
        return weeklyPopularityScore(guideId) >= POPULAR_THIS_WEEK_THRESHOLD;
    }

    private int effectivePrice(Guide guide) {
        if (guide.getSalePriceCents() != null
                && (guide.getSaleEndsAt() == null || guide.getSaleEndsAt().isAfter(Instant.now()))) {
            return guide.getSalePriceCents();
        }
        return guide.getPriceCents();
    }

    private GuideResponse parseGuideSnapshot(GuideVersion version) {
        try {
            return objectMapper.readValue(version.getSnapshot(), GuideResponse.class);
        } catch (JsonProcessingException e) {
            throw new BusinessException("Failed to parse guide snapshot");
        }
    }
}
