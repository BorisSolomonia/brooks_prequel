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
    private final ObjectMapper objectMapper;

    @Value("${app.frontend-base-url:http://localhost:3000}")
    private String frontendBaseUrl;

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
                guide.getPriceCents(),
                guide.getCurrency()
        );
        purchase.setStatus(GuidePurchaseStatus.COMPLETED);
        purchase.setTripTimezone(defaultTripTimezone(parseSnapshot(version)));
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
        purchase = guidePurchaseRepository.save(purchase);

        seedTripItems(purchase, parseSnapshot(version));
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
                .tripEndDate(purchase.getTripEndDate())
                .tripTimezone(resolveTripTimezone(purchase, guide))
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

        String timezone = request.getTripTimezone();
        if (timezone == null || timezone.isBlank()) {
            timezone = resolveTripTimezone(purchase, guide);
        }
        purchase.setTripTimezone(timezone);

        List<GuideTripItem> items = guideTripItemRepository.findByPurchaseIdOrderByDayNumberAscBlockPositionAscPlacePositionAsc(tripId);
        autoScheduleItems(items, purchase.getTripStartDate(), timezone);

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

    @Transactional(readOnly = true)
    public String buildCalendarFile(String auth0Subject, String email, UUID tripId) {
        User buyer = resolveBuyer(auth0Subject, email);
        GuidePurchase purchase = findOwnedTrip(tripId, buyer.getId());
        GuideResponse guide = parseSnapshot(purchase);
        List<GuideTripItem> items = guideTripItemRepository.findByPurchaseIdOrderByDayNumberAscBlockPositionAscPlacePositionAsc(tripId);

        if (purchase.getTripStartDate() != null) {
            autoScheduleItems(items, purchase.getTripStartDate(), resolveTripTimezone(purchase, guide));
        }

        String timezone = resolveTripTimezone(purchase, guide);
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
                .tripEndDate(purchase.getTripEndDate())
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

    private void autoScheduleItems(List<GuideTripItem> items, LocalDate tripStartDate, String timezone) {
        if (tripStartDate == null) {
            return;
        }

        ZoneId zoneId = parseZoneId(timezone);
        Map<Integer, Instant> dayCursor = new HashMap<>();

        for (GuideTripItem item : items) {
            LocalDate itemDate = tripStartDate.plusDays(Math.max(item.getDayNumber() - 1L, 0L));
            Instant defaultStart = defaultStart(item, itemDate, zoneId, dayCursor.get(item.getDayNumber()));
            Instant defaultEnd = defaultStart.plus(defaultDuration(item), ChronoUnit.MINUTES);

            if (item.getScheduledStart() == null) {
                item.setScheduledStart(defaultStart);
            }
            if (item.getScheduledEnd() == null) {
                item.setScheduledEnd(defaultEnd);
            }

            dayCursor.put(item.getDayNumber(), item.getScheduledEnd().plus(15, ChronoUnit.MINUTES));
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
}
