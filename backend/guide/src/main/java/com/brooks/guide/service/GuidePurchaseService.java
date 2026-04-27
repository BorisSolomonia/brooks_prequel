package com.brooks.guide.service;

import com.brooks.common.exception.BusinessException;
import com.brooks.common.exception.ResourceNotFoundException;
import com.brooks.guide.domain.*;
import com.brooks.guide.dto.*;
import com.brooks.guide.repository.GuidePurchaseRepository;
import com.brooks.guide.repository.GuideRepository;
import com.brooks.guide.repository.GuideTripItemRepository;
import com.brooks.guide.repository.GuideVersionRepository;
import com.brooks.user.domain.User;
import com.brooks.user.service.UserService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@RequiredArgsConstructor
public class GuidePurchaseService {

    private final GuideRepository guideRepository;
    private final GuideVersionRepository guideVersionRepository;
    private final GuidePurchaseRepository guidePurchaseRepository;
    private final GuideTripItemRepository guideTripItemRepository;
    private final UserService userService;
    private final GuideService guideService;
    private final ObjectMapper objectMapper;

    @Value("${app.frontend-base-url:http://localhost:3000}")
    private String frontendBaseUrl;

    private static final LocalTime DEFAULT_TRIP_START_TIME = LocalTime.of(9, 0);
    private static final LocalTime LATE_EVENT_START_TIME = LocalTime.of(20, 0);

    @Transactional
    public GuideCheckoutSessionResponse createCheckoutSession(String auth0Subject, String email, UUID guideId) {
        User buyer = resolveBuyer(auth0Subject, email);
        Guide guide = guideRepository.findById(guideId)
                .orElseThrow(() -> new ResourceNotFoundException("Guide", guideId));

        if (guide.getStatus() != GuideStatus.PUBLISHED) {
            throw new BusinessException("Only published guides can be purchased");
        }
        if (guide.getCreatorId().equals(buyer.getId())) {
            throw new BusinessException("Creators cannot purchase their own guides");
        }

        int effectivePrice = effectivePrice(guide);
        if (effectivePrice > 0) {
            throw new BusinessException("Payment provider not configured — this guide requires payment");
        }

        GuideVersion version = guideVersionRepository.findByGuideIdAndVersionNumber(guideId, guide.getVersionNumber())
                .orElseThrow(() -> new BusinessException("Published guide version snapshot is missing"));

        Optional<GuidePurchase> existingPurchase = guidePurchaseRepository
                .findByBuyerIdAndGuideVersionIdAndStatus(buyer.getId(), version.getId(), GuidePurchaseStatus.COMPLETED);

        if (existingPurchase.isPresent()) {
            GuidePurchase purchase = existingPurchase.get();
            return GuideCheckoutSessionResponse.builder()
                    .provider("mock")
                    .checkoutUrl(frontendBaseUrl + "/trips/" + purchase.getId())
                    .alreadyOwned(true)
                    .tripId(purchase.getId())
                    .build();
        }

        GuidePurchase purchase = new GuidePurchase(
                buyer.getId(),
                guideId,
                version.getId(),
                version.getVersionNumber(),
                "mock",
                effectivePrice,
                guide.getCurrency()
        );
        purchase.setStatus(GuidePurchaseStatus.COMPLETED);
        purchase.setTripTimezone(defaultTripTimezone(parseSnapshot(version)));
        purchase.setTripStartTime(DEFAULT_TRIP_START_TIME);
        purchase = guidePurchaseRepository.save(purchase);

        seedTripItems(purchase, parseSnapshot(version));

        return GuideCheckoutSessionResponse.builder()
                .provider("mock")
                .checkoutUrl(frontendBaseUrl + "/trips/" + purchase.getId())
                .alreadyOwned(false)
                .tripId(purchase.getId())
                .build();
    }

    @Transactional
    public GuideCheckoutSessionResponse giftGuide(String creatorAuth0Subject, String creatorEmail, UUID guideId, UUID recipientUserId) {
        User creator = resolveBuyer(creatorAuth0Subject, creatorEmail);
        Guide guide = guideRepository.findById(guideId)
                .orElseThrow(() -> new ResourceNotFoundException("Guide", guideId));

        if (!guide.getCreatorId().equals(creator.getId())) {
            throw new BusinessException("Only the guide creator can gift this guide");
        }
        if (guide.getStatus() != GuideStatus.PUBLISHED) {
            throw new BusinessException("Only published guides can be gifted");
        }

        User recipient = userService.findById(recipientUserId);

        GuideVersion version = guideVersionRepository.findByGuideIdAndVersionNumber(guideId, guide.getVersionNumber())
                .orElseThrow(() -> new BusinessException("Published guide version snapshot is missing"));

        Optional<GuidePurchase> existingPurchase = guidePurchaseRepository
                .findByBuyerIdAndGuideVersionIdAndStatus(recipient.getId(), version.getId(), GuidePurchaseStatus.COMPLETED);

        if (existingPurchase.isPresent()) {
            GuidePurchase existing = existingPurchase.get();
            return GuideCheckoutSessionResponse.builder()
                    .provider("gift")
                    .checkoutUrl(frontendBaseUrl + "/trips/" + existing.getId())
                    .alreadyOwned(true)
                    .tripId(existing.getId())
                    .build();
        }

        GuidePurchase purchase = new GuidePurchase(
                recipient.getId(),
                guideId,
                version.getId(),
                version.getVersionNumber(),
                "gift",
                0,
                guide.getCurrency()
        );
        purchase.setStatus(GuidePurchaseStatus.COMPLETED);
        purchase.setTripTimezone(defaultTripTimezone(parseSnapshot(version)));
        purchase.setTripStartTime(DEFAULT_TRIP_START_TIME);
        purchase = guidePurchaseRepository.save(purchase);

        seedTripItems(purchase, parseSnapshot(version));

        return GuideCheckoutSessionResponse.builder()
                .provider("gift")
                .checkoutUrl(frontendBaseUrl + "/trips/" + purchase.getId())
                .alreadyOwned(false)
                .tripId(purchase.getId())
                .build();
    }

    @Transactional
    public void materializeTripForPurchase(UUID buyerId, UUID guideId, int guideVersionNumber, int amountCents, String currency, String provider) {
        GuideVersion version = guideVersionRepository.findByGuideIdAndVersionNumber(guideId, guideVersionNumber)
                .orElseThrow(() -> new BusinessException("Guide version snapshot is missing"));

        Optional<GuidePurchase> existing = guidePurchaseRepository
                .findByBuyerIdAndGuideVersionIdAndStatus(buyerId, version.getId(), GuidePurchaseStatus.COMPLETED);
        if (existing.isPresent()) {
            return;
        }

        GuidePurchase purchase = new GuidePurchase(
                buyerId,
                guideId,
                version.getId(),
                version.getVersionNumber(),
                provider,
                amountCents,
                currency
        );
        purchase.setStatus(GuidePurchaseStatus.COMPLETED);
        purchase.setTripTimezone(defaultTripTimezone(parseSnapshot(version)));
        purchase.setTripStartTime(DEFAULT_TRIP_START_TIME);
        purchase = guidePurchaseRepository.save(purchase);

        seedTripItems(purchase, parseSnapshot(version));
    }

    @Transactional
    public MyTripSummaryResponse createCreatorTripCopy(String auth0Subject, String email, UUID guideId) {
        User creator = resolveBuyer(auth0Subject, email);
        Guide guide = guideRepository.findById(guideId)
                .orElseThrow(() -> new ResourceNotFoundException("Guide", guideId));
        if (!guide.getCreatorId().equals(creator.getId())) {
            throw new BusinessException("Only the guide creator can add this guide to their calendar");
        }
        if (guide.getStatus() == GuideStatus.DELETED) {
            throw new BusinessException("Deleted guides cannot be added to calendar");
        }

        Optional<GuidePurchase> existing = guidePurchaseRepository
                .findFirstByBuyerIdAndGuideIdAndProviderAndStatusOrderByCreatedAtDesc(
                        creator.getId(), guideId, "creator_copy", GuidePurchaseStatus.COMPLETED);
        if (existing.isPresent()) {
            return toSummaryResponse(existing.get());
        }

        GuideResponse snapshot = guideService.getGuide(auth0Subject, guideId);
        String snapshotJson;
        try {
            snapshotJson = objectMapper.writeValueAsString(snapshot);
        } catch (JsonProcessingException e) {
            throw new BusinessException("Failed to create guide snapshot");
        }

        GuidePurchase purchase = new GuidePurchase(
                creator.getId(),
                guideId,
                null,
                guide.getVersionNumber(),
                "creator_copy",
                0,
                guide.getCurrency()
        );
        purchase.setStatus(GuidePurchaseStatus.COMPLETED);
        purchase.setTripSource("CREATOR_COPY");
        purchase.setGuideSnapshot(snapshotJson);
        purchase.setTripTimezone(defaultTripTimezone(snapshot));
        purchase.setTripStartTime(DEFAULT_TRIP_START_TIME);
        purchase = guidePurchaseRepository.save(purchase);

        seedTripItems(purchase, snapshot);
        return toSummaryResponse(purchase);
    }

    @Transactional(readOnly = true)
    public MyTripsResponse getMyTrips(String auth0Subject, String email) {
        User buyer = resolveBuyer(auth0Subject, email);
        List<MyTripSummaryResponse> trips = guidePurchaseRepository
                .findByBuyerIdAndStatusOrderByCreatedAtDesc(buyer.getId(), GuidePurchaseStatus.COMPLETED)
                .stream()
                .map(this::toSummaryResponse)
                .toList();
        return MyTripsResponse.builder().trips(trips).build();
    }

    @Transactional(readOnly = true)
    public MyTripSummaryResponse getTripByGuide(String auth0Subject, String email, UUID guideId) {
        User buyer = resolveBuyer(auth0Subject, email);
        GuidePurchase purchase = guidePurchaseRepository
                .findFirstByBuyerIdAndGuideIdAndStatusOrderByCreatedAtDesc(buyer.getId(), guideId, GuidePurchaseStatus.COMPLETED)
                .orElseThrow(() -> new ResourceNotFoundException("Trip", guideId));
        return toSummaryResponse(purchase);
    }

    @Transactional(readOnly = true)
    public MyTripDetailResponse getTrip(String auth0Subject, String email, UUID tripId) {
        User buyer = resolveBuyer(auth0Subject, email);
        GuidePurchase purchase = findOwnedTrip(tripId, buyer.getId());
        GuideResponse guide = parseSnapshot(purchase);
        List<MyTripItemResponse> items = guideTripItemRepository
                .findByPurchaseIdOrderByDayNumberAscBlockPositionAscPlacePositionAsc(purchase.getId())
                .stream()
                .map(this::toItemResponse)
                .toList();

        return MyTripDetailResponse.builder()
                .id(purchase.getId())
                .guideId(purchase.getGuideId())
                .guideVersionId(purchase.getGuideVersionId())
                .guideVersionNumber(purchase.getGuideVersionNumber())
                .purchasedAt(purchase.getCreatedAt())
                .tripStartDate(purchase.getTripStartDate())
                .tripStartTime(resolveTripStartTime(purchase))
                .tripEndDate(purchase.getTripEndDate())
                .tripTimezone(resolveTripTimezone(purchase, guide))
                .tripSource(purchase.getTripSource())
                .guide(guide)
                .items(items)
                .build();
    }

    @Transactional
    public MyTripDetailResponse updateTripSetup(String auth0Subject, String email, UUID tripId, MyTripSetupRequest request) {
        User buyer = resolveBuyer(auth0Subject, email);
        GuidePurchase purchase = findOwnedTrip(tripId, buyer.getId());
        GuideResponse guide = parseSnapshot(purchase);

        if (request.getTripStartDate() != null) {
            purchase.setTripStartDate(request.getTripStartDate());
            purchase.setTripEndDate(request.getTripStartDate().plusDays(Math.max(guide.getDayCount() - 1L, 0L)));
        }
        if (request.getTripStartTime() != null) {
            purchase.setTripStartTime(request.getTripStartTime());
        } else if (purchase.getTripStartTime() == null) {
            purchase.setTripStartTime(DEFAULT_TRIP_START_TIME);
        }

        String timezone = request.getTripTimezone();
        if (timezone == null || timezone.isBlank()) {
            timezone = resolveTripTimezone(purchase, guide);
        }
        purchase.setTripTimezone(timezone);

        List<GuideTripItem> items = guideTripItemRepository.findByPurchaseIdOrderByDayNumberAscBlockPositionAscPlacePositionAsc(tripId);
        autoScheduleItems(items, purchase.getTripStartDate(), resolveTripStartTime(purchase), timezone, true);

        if (request.getItems() != null) {
            Map<UUID, MyTripItemUpdateRequest> updates = new HashMap<>();
            for (MyTripItemUpdateRequest item : request.getItems()) {
                if (item.getPlaceId() != null) {
                    updates.put(item.getPlaceId(), item);
                }
            }
            for (GuideTripItem item : items) {
                MyTripItemUpdateRequest update = updates.get(item.getPlaceId());
                if (update == null) {
                    continue;
                }
                item.setSkipped(update.isSkipped());
                if (update.getScheduledStart() != null) {
                    item.setScheduledStart(update.getScheduledStart());
                }
                if (update.getScheduledEnd() != null) {
                    item.setScheduledEnd(update.getScheduledEnd());
                } else if (item.getScheduledStart() != null) {
                    item.setScheduledEnd(item.getScheduledStart().plus(defaultDuration(item), ChronoUnit.MINUTES));
                }
            }
        }

        return getTrip(auth0Subject, email, tripId);
    }

    @Transactional
    public MyTripItemResponse toggleVisited(String auth0Subject, String email, UUID tripId, UUID itemId) {
        User buyer = resolveBuyer(auth0Subject, email);
        findOwnedTrip(tripId, buyer.getId());
        GuideTripItem item = guideTripItemRepository.findById(itemId)
                .filter(i -> i.getPurchase().getId().equals(tripId))
                .orElseThrow(() -> new ResourceNotFoundException("TripItem", itemId));
        boolean nowVisited = !item.isVisited();
        item.setVisited(nowVisited);
        item.setVisitedAt(nowVisited ? java.time.Instant.now() : null);
        guideTripItemRepository.save(item);
        return toItemResponse(item);
    }

    @Transactional
    public String buildCalendarFile(String auth0Subject, String email, UUID tripId, Set<UUID> acknowledgedLateItemIds) {
        CalendarExport export = prepareCalendarExport(auth0Subject, email, tripId, acknowledgedLateItemIds);
        GuideResponse guide = export.guide();
        List<GuideTripItem> items = export.items();
        GuidePurchase purchase = export.purchase();
        String timezone = export.timezone();
        StringBuilder builder = new StringBuilder();
        builder.append("BEGIN:VCALENDAR\r\n");
        builder.append("VERSION:2.0\r\n");
        builder.append("PRODID:-//Brooks//Travel Guide//EN\r\n");
        builder.append("CALSCALE:GREGORIAN\r\n");
        builder.append("METHOD:PUBLISH\r\n");
        builder.append("X-WR-CALNAME:").append(escapeIcsText(guide.getTitle())).append("\r\n");
        builder.append("X-WR-TIMEZONE:").append(escapeIcsText(timezone)).append("\r\n");

        for (GuideTripItem item : items) {
            if (item.isSkipped() || item.getScheduledStart() == null || item.getScheduledEnd() == null) {
                continue;
            }
            builder.append("BEGIN:VEVENT\r\n");
            builder.append("UID:").append(item.getId()).append("@brooks.local\r\n");
            builder.append("DTSTAMP:").append(formatUtc(purchase.getUpdatedAt() != null ? purchase.getUpdatedAt() : purchase.getCreatedAt())).append("\r\n");
            builder.append("DTSTART:").append(formatUtc(item.getScheduledStart())).append("\r\n");
            builder.append("DTEND:").append(formatUtc(item.getScheduledEnd())).append("\r\n");
            builder.append("SUMMARY:").append(escapeIcsText(item.getPlaceName())).append("\r\n");
            builder.append("DESCRIPTION:").append(escapeIcsText(buildEventDescription(guide, item))).append("\r\n");
            if (item.getPlaceAddress() != null && !item.getPlaceAddress().isBlank()) {
                builder.append("LOCATION:").append(escapeIcsText(item.getPlaceAddress())).append("\r\n");
            }
            builder.append("END:VEVENT\r\n");
        }

        builder.append("END:VCALENDAR\r\n");
        return builder.toString();
    }

    @Transactional
    public CalendarExport prepareCalendarExport(String auth0Subject, String email, UUID tripId, Set<UUID> acknowledgedLateItemIds) {
        User buyer = resolveBuyer(auth0Subject, email);
        GuidePurchase purchase = findOwnedTrip(tripId, buyer.getId());
        GuideResponse guide = parseSnapshot(purchase);
        if (purchase.getTripStartDate() == null) {
            throw new BusinessException("Choose a trip start date before adding this guide to calendar");
        }
        if (purchase.getTripStartTime() == null) {
            purchase.setTripStartTime(DEFAULT_TRIP_START_TIME);
        }

        String timezone = resolveTripTimezone(purchase, guide);
        List<GuideTripItem> items = guideTripItemRepository.findByPurchaseIdOrderByDayNumberAscBlockPositionAscPlacePositionAsc(tripId);
        autoScheduleItems(items, purchase.getTripStartDate(), resolveTripStartTime(purchase), timezone, false);

        List<CalendarLateEventResponse> lateEvents = lateEvents(items, timezone, acknowledgedLateItemIds);
        if (!lateEvents.isEmpty()) {
            throw new LateCalendarEventsException(lateEvents);
        }
        return new CalendarExport(purchase, guide, items, timezone);
    }

    public CalendarLateEventsResponse lateEventsResponse(List<CalendarLateEventResponse> lateEvents) {
        return CalendarLateEventsResponse.builder()
                .code("LATE_EVENTS_REQUIRE_CONFIRMATION")
                .message("Some events start after 20:00. Review them before adding this guide to calendar.")
                .lateEvents(lateEvents)
                .build();
    }

    private User resolveBuyer(String auth0Subject, String email) {
        Optional<User> existingUser = userService.findOptionalByAuth0Subject(auth0Subject);
        if (existingUser.isPresent()) {
            return existingUser.get();
        }
        if (email == null || email.isBlank()) {
            throw new BusinessException("Email is required to create an account. Please sign in again.");
        }
        return userService.findOrCreateUser(auth0Subject, email);
    }

    private GuidePurchase findOwnedTrip(UUID tripId, UUID buyerId) {
        return guidePurchaseRepository.findByIdAndBuyerId(tripId, buyerId)
                .orElseThrow(() -> new ResourceNotFoundException("Trip", tripId));
    }

    private MyTripSummaryResponse toSummaryResponse(GuidePurchase purchase) {
        GuideResponse guide = parseSnapshot(purchase);
        return MyTripSummaryResponse.builder()
                .id(purchase.getId())
                .guideId(purchase.getGuideId())
                .guideVersionId(purchase.getGuideVersionId())
                .guideVersionNumber(purchase.getGuideVersionNumber())
                .title(guide.getTitle())
                .coverImageUrl(guide.getCoverImageUrl())
                .region(guide.getRegion())
                .primaryCity(guide.getPrimaryCity())
                .country(guide.getCountry())
                .timezone(resolveTripTimezone(purchase, guide))
                .dayCount(guide.getDayCount())
                .placeCount(guide.getPlaceCount())
                .amountCents(purchase.getAmountCents())
                .currency(purchase.getCurrency())
                .purchasedAt(purchase.getCreatedAt())
                .tripStartDate(purchase.getTripStartDate())
                .tripStartTime(resolveTripStartTime(purchase))
                .tripEndDate(purchase.getTripEndDate())
                .tripSource(purchase.getTripSource())
                .build();
    }

    private MyTripItemResponse toItemResponse(GuideTripItem item) {
        return MyTripItemResponse.builder()
                .id(item.getId())
                .placeId(item.getPlaceId())
                .dayNumber(item.getDayNumber())
                .blockPosition(item.getBlockPosition())
                .placePosition(item.getPlacePosition())
                .blockTitle(item.getBlockTitle())
                .blockCategory(item.getBlockCategory())
                .placeName(item.getPlaceName())
                .placeAddress(item.getPlaceAddress())
                .latitude(item.getLatitude())
                .longitude(item.getLongitude())
                .suggestedStartMinute(item.getSuggestedStartMinute())
                .suggestedDurationMinutes(item.getSuggestedDurationMinutes())
                .scheduledStart(item.getScheduledStart())
                .scheduledEnd(item.getScheduledEnd())
                .skipped(item.isSkipped())
                .visited(item.isVisited())
                .visitedAt(item.getVisitedAt())
                .build();
    }

    private GuideResponse parseSnapshot(GuidePurchase purchase) {
        if (purchase.getGuideSnapshot() != null && !purchase.getGuideSnapshot().isBlank()) {
            try {
                return objectMapper.readValue(purchase.getGuideSnapshot(), GuideResponse.class);
            } catch (JsonProcessingException e) {
                throw new BusinessException("Failed to parse guide snapshot");
            }
        }
        GuideVersion version = guideVersionRepository.findById(purchase.getGuideVersionId())
                .orElseThrow(() -> new ResourceNotFoundException("GuideVersion", purchase.getGuideVersionId()));
        return parseSnapshot(version);
    }

    private GuideResponse parseSnapshot(GuideVersion version) {
        try {
            return objectMapper.readValue(version.getSnapshot(), GuideResponse.class);
        } catch (JsonProcessingException e) {
            throw new BusinessException("Failed to parse guide snapshot");
        }
    }

    private void seedTripItems(GuidePurchase purchase, GuideResponse snapshot) {
        for (GuideDayResponse day : snapshot.getDays()) {
            for (GuideBlockResponse block : day.getBlocks()) {
                for (GuidePlaceResponse place : block.getPlaces()) {
                    UUID placeId = resolveTripPlaceId(purchase, day, block, place);
                    GuideTripItem item = new GuideTripItem(
                            purchase,
                            placeId,
                            day.getDayNumber(),
                            block.getPosition(),
                            place.getPosition(),
                            place.getName()
                    );
                    item.setBlockTitle(block.getTitle());
                    item.setBlockCategory(block.getBlockCategory() != null ? block.getBlockCategory() : "ACTIVITY");
                    item.setPlaceAddress(place.getAddress());
                    item.setLatitude(place.getLatitude());
                    item.setLongitude(place.getLongitude());
                    item.setSuggestedDurationMinutes(place.getSuggestedDurationMinutes());
                    item.setSuggestedStartMinute(
                            place.getSuggestedStartMinute() != null ? place.getSuggestedStartMinute() : block.getSuggestedStartMinute()
                    );
                    purchase.getItems().add(item);
                }
            }
        }
        guidePurchaseRepository.save(purchase);
    }

    private UUID resolveTripPlaceId(GuidePurchase purchase, GuideDayResponse day, GuideBlockResponse block, GuidePlaceResponse place) {
        if (place.getId() != null) {
            return place.getId();
        }

        String seed = String.join("|",
                purchase.getGuideVersionId().toString(),
                String.valueOf(day.getDayNumber()),
                String.valueOf(block.getPosition()),
                String.valueOf(place.getPosition()),
                place.getName() != null ? place.getName() : "place");
        return UUID.nameUUIDFromBytes(seed.getBytes(StandardCharsets.UTF_8));
    }

    private void autoScheduleItems(List<GuideTripItem> items, LocalDate tripStartDate, LocalTime tripStartTime, String timezone, boolean resetExisting) {
        if (tripStartDate == null) {
            return;
        }

        ZoneId zoneId = parseZoneId(timezone);
        LocalTime startTime = tripStartTime != null ? tripStartTime : DEFAULT_TRIP_START_TIME;
        List<Instant> defaultStarts = new ArrayList<>();
        List<Instant> defaultEnds = new ArrayList<>();
        Map<Integer, Instant> dayCursor = new HashMap<>();

        for (GuideTripItem item : items) {
            LocalDate itemDate = tripStartDate.plusDays(Math.max(item.getDayNumber() - 1L, 0L));
            Instant defaultStart = defaultStart(item, itemDate, zoneId, dayCursor.get(item.getDayNumber()));
            Instant defaultEnd = defaultStart.plus(defaultDuration(item), ChronoUnit.MINUTES);
            defaultStarts.add(defaultStart);
            defaultEnds.add(defaultEnd);
            dayCursor.put(item.getDayNumber(), defaultEnd.plus(15, ChronoUnit.MINUTES));
        }

        Optional<Instant> firstDefault = defaultStarts.stream().findFirst();
        if (firstDefault.isEmpty()) {
            return;
        }
        Instant requestedFirstStart = tripStartDate.atTime(startTime).atZone(zoneId).toInstant();
        Duration shift = Duration.between(firstDefault.get(), requestedFirstStart);

        for (int i = 0; i < items.size(); i++) {
            GuideTripItem item = items.get(i);
            Instant shiftedStart = defaultStarts.get(i).plus(shift);
            Instant shiftedEnd = defaultEnds.get(i).plus(shift);

            if (resetExisting || item.getScheduledStart() == null) {
                item.setScheduledStart(shiftedStart);
            }
            if (resetExisting || item.getScheduledEnd() == null) {
                item.setScheduledEnd(shiftedEnd);
            }
        }
    }

    private Instant defaultStart(GuideTripItem item, LocalDate date, ZoneId zoneId, Instant existingCursor) {
        if (item.getSuggestedStartMinute() != null) {
            return date.atStartOfDay(zoneId).plusMinutes(item.getSuggestedStartMinute()).toInstant();
        }
        if (existingCursor != null) {
            return existingCursor;
        }
        return date.atStartOfDay(zoneId).plusHours(9).toInstant();
    }

    private long defaultDuration(GuideTripItem item) {
        return item.getSuggestedDurationMinutes() != null && item.getSuggestedDurationMinutes() > 0
                ? item.getSuggestedDurationMinutes()
                : 90L;
    }

    private String buildEventDescription(GuideResponse guide, GuideTripItem item) {
        StringBuilder description = new StringBuilder();
        description.append(guide.getTitle());
        description.append(" - Day ").append(item.getDayNumber());
        if (item.getBlockTitle() != null && !item.getBlockTitle().isBlank()) {
            description.append(" / ").append(item.getBlockTitle());
        }
        if (item.getPlaceAddress() != null && !item.getPlaceAddress().isBlank()) {
            description.append("\n").append(item.getPlaceAddress());
        }
        if (item.getLatitude() != null && item.getLongitude() != null) {
            description.append("\nhttps://www.google.com/maps/search/?api=1&query=")
                    .append(URLEncoder.encode(item.getLatitude() + "," + item.getLongitude(), StandardCharsets.UTF_8));
        }
        return description.toString();
    }

    private String resolveTripTimezone(GuidePurchase purchase, GuideResponse guide) {
        if (purchase.getTripTimezone() != null && !purchase.getTripTimezone().isBlank()) {
            return purchase.getTripTimezone();
        }
        return defaultTripTimezone(guide);
    }

    private LocalTime resolveTripStartTime(GuidePurchase purchase) {
        return purchase.getTripStartTime() != null ? purchase.getTripStartTime() : DEFAULT_TRIP_START_TIME;
    }

    private String defaultTripTimezone(GuideResponse guide) {
        return (guide.getTimezone() != null && !guide.getTimezone().isBlank()) ? guide.getTimezone() : "UTC";
    }

    private ZoneId parseZoneId(String timezone) {
        try {
            return ZoneId.of(timezone);
        } catch (DateTimeException ex) {
            return ZoneId.of("UTC");
        }
    }

    private String formatUtc(Instant instant) {
        return DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss'Z'")
                .withZone(ZoneOffset.UTC)
                .format(instant);
    }

    private String escapeIcsText(String value) {
        return value
                .replace("\\", "\\\\")
                .replace("\n", "\\n")
                .replace(",", "\\,")
                .replace(";", "\\;");
    }

    private List<CalendarLateEventResponse> lateEvents(List<GuideTripItem> items, String timezone, Set<UUID> acknowledgedLateItemIds) {
        Set<UUID> acknowledged = acknowledgedLateItemIds != null ? acknowledgedLateItemIds : Set.of();
        ZoneId zoneId = parseZoneId(timezone);
        List<CalendarLateEventResponse> lateEvents = new ArrayList<>();
        for (GuideTripItem item : items) {
            if (item.isSkipped() || item.getScheduledStart() == null || acknowledged.contains(item.getId())) {
                continue;
            }
            LocalTime localStart = item.getScheduledStart().atZone(zoneId).toLocalTime();
            if (localStart.isAfter(LATE_EVENT_START_TIME)) {
                lateEvents.add(CalendarLateEventResponse.builder()
                        .itemId(item.getId())
                        .placeName(item.getPlaceName())
                        .scheduledStart(item.getScheduledStart())
                        .localStartTime(localStart.truncatedTo(ChronoUnit.MINUTES).toString())
                        .build());
            }
        }
        return lateEvents;
    }

    private int effectivePrice(Guide guide) {
        if (guide.getSalePriceCents() != null &&
                (guide.getSaleEndsAt() == null || guide.getSaleEndsAt().isAfter(Instant.now()))) {
            return guide.getSalePriceCents();
        }
        return guide.getPriceCents();
    }

    public record CalendarExport(GuidePurchase purchase, GuideResponse guide, List<GuideTripItem> items, String timezone) {
    }

    public static class LateCalendarEventsException extends RuntimeException {
        private final List<CalendarLateEventResponse> lateEvents;

        public LateCalendarEventsException(List<CalendarLateEventResponse> lateEvents) {
            super("Some events start after 20:00");
            this.lateEvents = lateEvents;
        }

        public List<CalendarLateEventResponse> getLateEvents() {
            return lateEvents;
        }
    }
}
