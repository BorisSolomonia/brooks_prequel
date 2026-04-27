package com.brooks.guide.service;

import com.brooks.common.exception.BusinessException;
import com.brooks.guide.domain.GuideTripItem;
import com.brooks.guide.domain.TripCalendarEvent;
import com.brooks.guide.domain.UserCalendarConnection;
import com.brooks.guide.dto.*;
import com.brooks.guide.repository.TripCalendarEventRepository;
import com.brooks.guide.repository.UserCalendarConnectionRepository;
import com.brooks.user.domain.User;
import com.brooks.user.service.UserService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CalendarService {

    private static final String GOOGLE = "google";
    private static final String GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
    private static final String GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";
    private static final String GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";

    private final UserService userService;
    private final GuidePurchaseService guidePurchaseService;
    private final UserCalendarConnectionRepository connectionRepository;
    private final TripCalendarEventRepository eventRepository;
    private final CalendarTokenCipher tokenCipher;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newHttpClient();

    @Value("${calendar.google.client-id:}")
    private String googleClientId;

    @Value("${calendar.google.client-secret:}")
    private String googleClientSecret;

    @Value("${calendar.google.calendar-name:Brooks Trips}")
    private String googleCalendarName;

    @Transactional(readOnly = true)
    public CalendarConnectionStatusResponse status(String auth0Subject, String email) {
        User user = resolveUser(auth0Subject, email);
        Optional<UserCalendarConnection> connection = connectionRepository.findByUserIdAndProvider(user.getId(), GOOGLE);
        return CalendarConnectionStatusResponse.builder()
                .googleConnected(connection.isPresent())
                .googleAccountEmail(connection.map(UserCalendarConnection::getProviderAccountEmail).orElse(null))
                .googleCalendarId(connection.map(UserCalendarConnection::getExternalCalendarId).orElse(null))
                .build();
    }

    @Transactional
    public CalendarConnectionStatusResponse connectGoogle(String auth0Subject, String email, GoogleCalendarConnectRequest request) {
        requireGoogleConfig();
        User user = resolveUser(auth0Subject, email);
        if (request.getCode() == null || request.getCode().isBlank() || request.getRedirectUri() == null || request.getRedirectUri().isBlank()) {
            throw new BusinessException("Google authorization code is required");
        }

        Map<String, Object> token = tokenRequest(Map.of(
                "code", request.getCode(),
                "client_id", googleClientId,
                "client_secret", googleClientSecret,
                "redirect_uri", request.getRedirectUri(),
                "grant_type", "authorization_code"
        ));
        String accessToken = asString(token.get("access_token"));
        String refreshToken = asString(token.get("refresh_token"));
        if (accessToken == null || accessToken.isBlank()) {
            throw new BusinessException("Google did not return an access token");
        }

        Optional<UserCalendarConnection> existing = connectionRepository.findByUserIdAndProvider(user.getId(), GOOGLE);
        if ((refreshToken == null || refreshToken.isBlank()) && existing.isEmpty()) {
            throw new BusinessException("Google did not return a refresh token. Disconnect and approve offline calendar access again.");
        }

        UserCalendarConnection connection = existing.orElseGet(() ->
                new UserCalendarConnection(user.getId(), GOOGLE, tokenCipher.encrypt(refreshToken)));
        if (refreshToken != null && !refreshToken.isBlank()) {
            connection.setEncryptedRefreshToken(tokenCipher.encrypt(refreshToken));
        }
        connection.setAccessToken(accessToken);
        connection.setAccessTokenExpiresAt(Instant.now().plusSeconds(asLong(token.get("expires_in"), 3600L)));
        connection.setProviderAccountEmail(fetchGoogleEmail(accessToken));
        connection.setConnectedAt(Instant.now());
        connectionRepository.save(connection);

        return status(auth0Subject, email);
    }

    @Transactional
    public void disconnectGoogle(String auth0Subject, String email) {
        User user = resolveUser(auth0Subject, email);
        connectionRepository.deleteByUserIdAndProvider(user.getId(), GOOGLE);
    }

    @Transactional
    public GoogleCalendarSyncResponse syncGoogle(String auth0Subject, String email, UUID tripId, GoogleCalendarSyncRequest request) {
        requireGoogleConfig();
        User user = resolveUser(auth0Subject, email);
        UserCalendarConnection connection = connectionRepository.findByUserIdAndProvider(user.getId(), GOOGLE)
                .orElseThrow(() -> new BusinessException("Connect Google Calendar before syncing this trip"));

        Set<UUID> acknowledged = request != null && request.getAcknowledgedLateItemIds() != null
                ? new HashSet<>(request.getAcknowledgedLateItemIds())
                : Collections.emptySet();
        GuidePurchaseService.CalendarExport export = guidePurchaseService.prepareCalendarExport(auth0Subject, email, tripId, acknowledged);
        String accessToken = validAccessToken(connection);
        String calendarId = ensureBrooksCalendar(connection, accessToken);

        Map<UUID, TripCalendarEvent> existingEvents = eventRepository.findByPurchaseIdAndProvider(export.purchase().getId(), GOOGLE)
                .stream()
                .collect(Collectors.toMap(TripCalendarEvent::getTripItemId, Function.identity()));

        int created = 0;
        int updated = 0;
        int deleted = 0;
        Set<UUID> activeItemIds = new HashSet<>();

        for (GuideTripItem item : export.items()) {
            TripCalendarEvent existing = existingEvents.get(item.getId());
            if (item.isSkipped() || item.getScheduledStart() == null || item.getScheduledEnd() == null) {
                if (existing != null) {
                    deleteEvent(accessToken, calendarId, existing.getExternalEventId());
                    eventRepository.delete(existing);
                    deleted++;
                }
                activeItemIds.add(item.getId());
                continue;
            }

            activeItemIds.add(item.getId());
            Map<String, Object> eventBody = buildGoogleEvent(export, item);
            if (existing == null) {
                String externalEventId = createEvent(accessToken, calendarId, eventBody);
                eventRepository.save(new TripCalendarEvent(export.purchase().getId(), item.getId(), GOOGLE, calendarId, externalEventId));
                created++;
            } else {
                updateEvent(accessToken, calendarId, existing.getExternalEventId(), eventBody);
                existing.setLastSyncedAt(Instant.now());
                existing.setExternalCalendarId(calendarId);
                updated++;
            }
        }

        for (TripCalendarEvent stale : existingEvents.values()) {
            if (!activeItemIds.contains(stale.getTripItemId()) && eventRepository.existsById(stale.getId())) {
                deleteEvent(accessToken, calendarId, stale.getExternalEventId());
                eventRepository.delete(stale);
                deleted++;
            }
        }

        return GoogleCalendarSyncResponse.builder()
                .created(created)
                .updated(updated)
                .deleted(deleted)
                .calendarUrl("https://calendar.google.com/calendar/u/0/r?cid=" + urlEncode(calendarId))
                .build();
    }

    private String validAccessToken(UserCalendarConnection connection) {
        if (connection.getAccessToken() != null
                && connection.getAccessTokenExpiresAt() != null
                && connection.getAccessTokenExpiresAt().isAfter(Instant.now().plusSeconds(60))) {
            return connection.getAccessToken();
        }
        Map<String, Object> token = tokenRequest(Map.of(
                "refresh_token", tokenCipher.decrypt(connection.getEncryptedRefreshToken()),
                "client_id", googleClientId,
                "client_secret", googleClientSecret,
                "grant_type", "refresh_token"
        ));
        String accessToken = asString(token.get("access_token"));
        if (accessToken == null || accessToken.isBlank()) {
            throw new BusinessException("Failed to refresh Google Calendar access");
        }
        connection.setAccessToken(accessToken);
        connection.setAccessTokenExpiresAt(Instant.now().plusSeconds(asLong(token.get("expires_in"), 3600L)));
        connectionRepository.save(connection);
        return accessToken;
    }

    private String ensureBrooksCalendar(UserCalendarConnection connection, String accessToken) {
        if (connection.getExternalCalendarId() != null && !connection.getExternalCalendarId().isBlank()) {
            return connection.getExternalCalendarId();
        }
        Map<String, Object> response = sendJson("POST", GOOGLE_CALENDAR_API + "/calendars", accessToken, Map.of(
                "summary", googleCalendarName,
                "timeZone", "UTC"
        ));
        String calendarId = asString(response.get("id"));
        if (calendarId == null || calendarId.isBlank()) {
            throw new BusinessException("Failed to create Brooks Google calendar");
        }
        connection.setExternalCalendarId(calendarId);
        connectionRepository.save(connection);
        return calendarId;
    }

    private Map<String, Object> buildGoogleEvent(GuidePurchaseService.CalendarExport export, GuideTripItem item) {
        ZoneId zone = parseZoneId(export.timezone());
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("summary", item.getPlaceName());
        body.put("description", buildDescription(export, item));
        if (item.getPlaceAddress() != null && !item.getPlaceAddress().isBlank()) {
            body.put("location", item.getPlaceAddress());
        }
        body.put("start", Map.of(
                "dateTime", DateTimeFormatter.ISO_OFFSET_DATE_TIME.format(item.getScheduledStart().atZone(zone)),
                "timeZone", zone.getId()
        ));
        body.put("end", Map.of(
                "dateTime", DateTimeFormatter.ISO_OFFSET_DATE_TIME.format(item.getScheduledEnd().atZone(zone)),
                "timeZone", zone.getId()
        ));
        return body;
    }

    private String buildDescription(GuidePurchaseService.CalendarExport export, GuideTripItem item) {
        StringBuilder description = new StringBuilder();
        description.append(export.guide().getTitle()).append(" - Day ").append(item.getDayNumber());
        if (item.getBlockTitle() != null && !item.getBlockTitle().isBlank()) {
            description.append(" / ").append(item.getBlockTitle());
        }
        if (item.getPlaceAddress() != null && !item.getPlaceAddress().isBlank()) {
            description.append("\n").append(item.getPlaceAddress());
        }
        if (item.getLatitude() != null && item.getLongitude() != null) {
            description.append("\nhttps://www.google.com/maps/search/?api=1&query=")
                    .append(urlEncode(item.getLatitude() + "," + item.getLongitude()));
        }
        return description.toString();
    }

    private String createEvent(String accessToken, String calendarId, Map<String, Object> body) {
        Map<String, Object> response = sendJson("POST", GOOGLE_CALENDAR_API + "/calendars/" + urlEncode(calendarId) + "/events", accessToken, body);
        String eventId = asString(response.get("id"));
        if (eventId == null || eventId.isBlank()) {
            throw new BusinessException("Failed to create Google Calendar event");
        }
        return eventId;
    }

    private void updateEvent(String accessToken, String calendarId, String eventId, Map<String, Object> body) {
        sendJson("PUT", GOOGLE_CALENDAR_API + "/calendars/" + urlEncode(calendarId) + "/events/" + urlEncode(eventId), accessToken, body);
    }

    private void deleteEvent(String accessToken, String calendarId, String eventId) {
        HttpRequest request = HttpRequest.newBuilder(URI.create(GOOGLE_CALENDAR_API + "/calendars/" + urlEncode(calendarId) + "/events/" + urlEncode(eventId)))
                .DELETE()
                .header("Authorization", "Bearer " + accessToken)
                .build();
        send(request, false);
    }

    private String fetchGoogleEmail(String accessToken) {
        HttpRequest request = HttpRequest.newBuilder(URI.create(GOOGLE_USERINFO_URL))
                .GET()
                .header("Authorization", "Bearer " + accessToken)
                .build();
        Map<String, Object> response = send(request, true);
        return asString(response.get("email"));
    }

    private Map<String, Object> tokenRequest(Map<String, String> params) {
        String form = params.entrySet().stream()
                .map(entry -> urlEncode(entry.getKey()) + "=" + urlEncode(entry.getValue()))
                .collect(Collectors.joining("&"));
        HttpRequest request = HttpRequest.newBuilder(URI.create(GOOGLE_TOKEN_URL))
                .POST(HttpRequest.BodyPublishers.ofString(form))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .build();
        return send(request, true);
    }

    private Map<String, Object> sendJson(String method, String url, String accessToken, Map<String, Object> body) {
        try {
            HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(url))
                    .header("Authorization", "Bearer " + accessToken)
                    .header("Content-Type", "application/json");
            String json = objectMapper.writeValueAsString(body);
            if ("POST".equals(method)) {
                builder.POST(HttpRequest.BodyPublishers.ofString(json));
            } else if ("PUT".equals(method)) {
                builder.PUT(HttpRequest.BodyPublishers.ofString(json));
            } else {
                throw new IllegalArgumentException("Unsupported method " + method);
            }
            return send(builder.build(), true);
        } catch (Exception e) {
            throw new BusinessException("Failed to call Google Calendar");
        }
    }

    private Map<String, Object> send(HttpRequest request, boolean expectJson) {
        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                if (request.method().equals("DELETE") && response.statusCode() == 404) {
                    return Map.of();
                }
                throw new BusinessException("Google Calendar request failed");
            }
            if (!expectJson || response.body() == null || response.body().isBlank()) {
                return Map.of();
            }
            return objectMapper.readValue(response.body(), new TypeReference<>() {});
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            throw new BusinessException("Google Calendar request failed");
        }
    }

    private User resolveUser(String auth0Subject, String email) {
        return userService.findOptionalByAuth0Subject(auth0Subject)
                .orElseGet(() -> {
                    if (email == null || email.isBlank()) {
                        throw new BusinessException("Email is required to create an account. Please sign in again.");
                    }
                    return userService.findOrCreateUser(auth0Subject, email);
                });
    }

    private void requireGoogleConfig() {
        if (googleClientId == null || googleClientId.isBlank() || googleClientSecret == null || googleClientSecret.isBlank()) {
            throw new BusinessException("Google Calendar is not configured");
        }
    }

    private String asString(Object value) {
        return value instanceof String string ? string : null;
    }

    private long asLong(Object value, long fallback) {
        if (value instanceof Number number) {
            return number.longValue();
        }
        return fallback;
    }

    private String urlEncode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private ZoneId parseZoneId(String timezone) {
        try {
            return ZoneId.of(timezone);
        } catch (Exception ex) {
            return ZoneId.of("UTC");
        }
    }
}
