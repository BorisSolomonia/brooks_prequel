package com.brooks.memory.service;

import com.brooks.common.event.MemoryReplyCreatedEvent;
import com.brooks.common.exception.BusinessException;
import com.brooks.common.exception.ResourceNotFoundException;
import com.brooks.memory.domain.*;
import com.brooks.memory.dto.*;
import com.brooks.memory.repository.*;
import com.brooks.profile.domain.UserProfile;
import com.brooks.profile.repository.UserProfileRepository;
import com.brooks.user.domain.User;
import com.brooks.user.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class MemoryService {

    private static final String TOKEN_ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final MemoryRepository memoryRepository;
    private final MemoryShareRepository shareRepository;
    private final MemoryRevealRepository revealRepository;
    private final MemoryCreatorVisibilityPreferenceRepository visibilityPreferenceRepository;
    private final ProductEventService productEventService;
    private final MemorySchemaHealthService memorySchemaHealthService;
    private final UserService userService;
    private final UserProfileRepository profileRepository;
    private final MemoryGrantService memoryGrantService;
    private final MemoryGrantRepository memoryGrantRepository;
    private final ApplicationEventPublisher events;

    @Value("${app.frontend-base-url:http://localhost:3000}")
    private String frontendBaseUrl;

    @Value("${app.memory.unlock-radius-meters:100}")
    private double unlockRadiusMeters;

    @Value("${app.memory.daily-create-limit:25}")
    private long dailyCreateLimit;

    @Value("${app.memory.blocked-terms:}")
    private List<String> blockedTerms;

    @Transactional
    public MemoryResponse createMemory(String auth0Subject, MemoryCreateRequest request) {
        try {
            User creator = userService.findByAuth0Subject(auth0Subject);
            if (!memorySchemaHealthService.isMemorySchemaReady()) {
                throw new BusinessException("Memory storage is not ready. Run database migrations and retry.");
            }
            enforceDailyLimit(creator.getId());
            validateText(request.getTextContent());
            validateFutureExpiration(request.getExpiresAt());

            Memory memory = new Memory(creator.getId(), request.getTextContent().trim(), request.getLatitude(), request.getLongitude());
            memory.setPlaceLabel(blankToNull(request.getPlaceLabel()));
            memory.setVisibility(request.getVisibility() != null ? request.getVisibility() : MemoryVisibility.PRIVATE);
            memory.setExpiresAt(request.getExpiresAt());

            replaceMedia(memory, request.getMedia(), creator.getId());
            memory = memoryRepository.save(memory);
            productEventService.record("MEMORY_CREATED", creator.getId(), memory.getId(), null, null);
            return toResponse(memory, creator.getId());
        } catch (BusinessException | ResourceNotFoundException ex) {
            throw ex;
        } catch (RuntimeException ex) {
            log.error("Failed to create memory for auth0Subject={}, latitude={}, longitude={}, mediaCount={}",
                    auth0Subject,
                    request.getLatitude(),
                    request.getLongitude(),
                    request.getMedia() == null ? 0 : request.getMedia().size(),
                    ex);
            throw ex;
        }
    }

    @Transactional
    public MemoryResponse createReply(String auth0Subject, UUID parentMemoryId, MemoryReplyRequest request) {
        User replier = userService.findByAuth0Subject(auth0Subject);
        if (!memorySchemaHealthService.isMemorySchemaReady()) {
            throw new BusinessException("Memory storage is not ready. Run database migrations and retry.");
        }
        Memory parent = memoryRepository.findById(parentMemoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Memory", parentMemoryId));
        if (!isActive(parent)) {
            throw new BusinessException("Memory is unavailable");
        }
        if (!canReplyTo(parent, replier.getId())) {
            throw new BusinessException("You can only add a memory to one shared with you that you've unlocked here");
        }
        enforceDailyLimit(replier.getId());
        validateText(request.getTextContent());

        // A reply inherits the parent's coordinates — it pins at the same physical spot.
        Memory reply = new Memory(replier.getId(), request.getTextContent().trim(),
                parent.getLatitude(), parent.getLongitude());
        reply.setPlaceLabel(parent.getPlaceLabel());
        reply.setVisibility(MemoryVisibility.PRIVATE);
        reply.setParentMemoryId(parent.getId());
        replaceMedia(reply, request.getMedia(), replier.getId());
        reply = memoryRepository.save(reply);
        productEventService.record("MEMORY_REPLY_CREATED", replier.getId(), reply.getId(), null, null);

        // Notify the parent's creator — "[name] added their memory to yours!" — unless self-reply.
        if (!parent.getCreatorId().equals(replier.getId())) {
            events.publishEvent(new MemoryReplyCreatedEvent(
                    parent.getId(), reply.getId(), parent.getCreatorId(), replier.getId()));
        }
        return toResponse(reply, replier.getId());
    }

    /**
     * Replies the viewer is entitled to see: the parent's creator sees EVERY reply; everyone else
     * sees only the replies they authored (per-edge "author + replier only" visibility).
     */
    @Transactional(readOnly = true)
    public List<MemoryResponse> listReplies(String auth0Subject, UUID parentMemoryId) {
        User viewer = userService.findByAuth0Subject(auth0Subject);
        Memory parent = memoryRepository.findById(parentMemoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Memory", parentMemoryId));
        boolean parentCreator = parent.getCreatorId().equals(viewer.getId());
        return memoryRepository.findByParentMemoryIdAndDeletedAtIsNullOrderByCreatedAtAsc(parentMemoryId).stream()
                .filter(r -> parentCreator || r.getCreatorId().equals(viewer.getId()))
                .map(r -> toResponse(r, viewer.getId()))
                .toList();
    }

    /**
     * May {@code viewerId} add a reply to {@code parent}? Yes when they created the parent (extend
     * their own thread), hold a REVEALED grant on it (unlocked it on-site), or created the parent's
     * parent (so the person being replied to can reply back — enables nested A↔B threads).
     */
    private boolean canReplyTo(Memory parent, UUID viewerId) {
        if (parent.getCreatorId().equals(viewerId)) {
            return true;
        }
        boolean revealedGrantee = memoryGrantRepository
                .findByMemoryIdAndBeneficiaryUserId(parent.getId(), viewerId)
                .filter(g -> g.getRemovedAt() == null && g.getRevealedAt() != null)
                .isPresent();
        if (revealedGrantee) {
            return true;
        }
        if (parent.getParentMemoryId() != null) {
            return memoryRepository.findById(parent.getParentMemoryId())
                    .map(grandParent -> grandParent.getCreatorId().equals(viewerId))
                    .orElse(false);
        }
        return false;
    }

    @Transactional(readOnly = true)
    public MemoryResponse getMemory(String auth0Subject, UUID memoryId) {
        User viewer = userService.findByAuth0Subject(auth0Subject);
        Memory memory = findOwnedMemory(viewer.getId(), memoryId);
        return toResponse(memory, viewer.getId());
    }

    /** Memories I created — newest first. Used by /memories "Created" tab. */
    @Transactional(readOnly = true)
    public List<MemoryResponse> listMyCreatedMemories(String auth0Subject) {
        User viewer = userService.findByAuth0Subject(auth0Subject);
        return memoryRepository.findMyCreatedMemories(viewer.getId()).stream()
                .map(m -> toResponse(m, viewer.getId()))
                .toList();
    }

    /** Memories shared with me (via link redemption OR direct in-app share). */
    @Transactional(readOnly = true)
    public List<MemoryResponse> listMemoriesSharedWithMe(String auth0Subject) {
        User viewer = userService.findByAuth0Subject(auth0Subject);
        List<Memory> memories = memoryRepository.findMemoriesSharedWithMe(viewer.getId());
        if (memories.isEmpty()) {
            return List.of();
        }
        // Redact contents for shares not yet unlocked by reaching the location.
        List<UUID> memoryIds = memories.stream().map(Memory::getId).toList();
        Set<UUID> revealedIds = new HashSet<>(
                memoryGrantRepository.findRevealedGrantedMemoryIdsForBeneficiary(viewer.getId(), memoryIds));
        return memories.stream()
                .map(m -> toResponse(m, viewer.getId(), contentVisible(m, viewer.getId(), revealedIds)))
                .toList();
    }

    @Transactional
    public MemoryResponse updateMemory(String auth0Subject, UUID memoryId, MemoryUpdateRequest request) {
        User viewer = userService.findByAuth0Subject(auth0Subject);
        Memory memory = findOwnedMemory(viewer.getId(), memoryId);

        if (request.getTextContent() != null) {
            validateText(request.getTextContent());
            memory.setTextContent(request.getTextContent().trim());
        }
        if (request.getPlaceLabel() != null) {
            memory.setPlaceLabel(blankToNull(request.getPlaceLabel()));
        }
        if (request.getVisibility() != null) {
            memory.setVisibility(request.getVisibility());
        }
        if (request.getExpiresAt() != null) {
            validateFutureExpiration(request.getExpiresAt());
            memory.setExpiresAt(request.getExpiresAt());
        }
        if (request.getMedia() != null) {
            replaceMedia(memory, request.getMedia(), viewer.getId());
        }

        return toResponse(memory, viewer.getId());
    }

    @Transactional
    public void deleteMemory(String auth0Subject, UUID memoryId) {
        User viewer = userService.findByAuth0Subject(auth0Subject);
        Memory memory = findOwnedMemory(viewer.getId(), memoryId);
        memory.setDeletedAt(Instant.now());
        Instant revokedAt = Instant.now();
        shareRepository.findByMemory_IdAndRevokedAtIsNull(memoryId)
                .forEach(share -> share.setRevokedAt(revokedAt));
        productEventService.record("MEMORY_DELETED", viewer.getId(), memoryId, null, null);
    }

    public MemoryMapResponse getMapMemories(String auth0Subject, double north, double south, double east, double west) {
        User viewer = userService.findByAuth0Subject(auth0Subject);
        if (!memorySchemaHealthService.isMemorySchemaReady()) {
            return MemoryMapResponse.builder()
                    .memories(List.of())
                    .build();
        }
        validateBounds(north, south, east, west);
        List<Memory> memories;
        try {
            List<UUID> memoryIds = memoryRepository.findVisibleMapMemoryIds(viewer.getId(), north, south, east, west);
            memories = memoryIds.isEmpty()
                    ? List.of()
                    : orderByIds(memoryRepository.findAllWithMediaByIdIn(memoryIds), memoryIds);
        } catch (RuntimeException ex) {
            log.error("Failed to load memory map pins for viewer {} and bounds north={}, south={}, east={}, west={}",
                    viewer.getId(), north, south, east, west, ex);
            memories = List.of();
        }
        return MemoryMapResponse.builder()
                .memories(toMapPins(memories, viewer.getId()))
                .build();
    }

    @Transactional
    public MemoryShareResponse shareMemory(String auth0Subject, UUID memoryId) {
        User viewer = userService.findByAuth0Subject(auth0Subject);
        Memory memory = findOwnedMemory(viewer.getId(), memoryId);

        if (memory.getVisibility() == MemoryVisibility.PRIVATE) {
            memory.setVisibility(MemoryVisibility.SHARED_LINK);
        }

        MemoryShare share = shareRepository.findFirstByMemory_IdAndRevokedAtIsNullOrderByCreatedAtDesc(memoryId)
                .orElseGet(() -> shareRepository.save(new MemoryShare(memory, generateToken())));
        productEventService.record("MEMORY_SHARED", viewer.getId(), memoryId, share.getToken(), null);
        return MemoryShareResponse.builder()
                .token(share.getToken())
                .shareUrl(frontendBaseUrl + "/m/" + share.getToken())
                .build();
    }

    @Transactional
    public MemoryShareTeaserResponse getShareTeaser(String token) {
        Optional<MemoryShare> optionalShare = shareRepository.findByTokenAndRevokedAtIsNull(token);
        if (optionalShare.isEmpty()) {
            return unavailableTeaser(token, "Memory is unavailable");
        }

        MemoryShare share = optionalShare.get();
        Memory memory = share.getMemory();
        productEventService.record("SHARE_OPENED", null, memory.getId(), token, null);
        if (!isActive(memory)) {
            return unavailableTeaser(token, "Memory is unavailable");
        }

        CreatorSummary creator = creatorSummary(memory.getCreatorId());
        return MemoryShareTeaserResponse.builder()
                .token(token)
                .senderName(creator.displayName())
                .senderAvatarUrl(creator.avatarUrl())
                .placeLabel(memory.getPlaceLabel())
                .approximateLatitude(memory.getLatitude())
                .approximateLongitude(memory.getLongitude())
                .available(true)
                .createdAt(memory.getCreatedAt())
                .build();
    }

    @Transactional
    public MemoryRevealResponse revealShare(String auth0Subject, String token, MemoryRevealRequest request) {
        User viewer = userService.findByAuth0Subject(auth0Subject);
        MemoryShare share = shareRepository.findByTokenAndRevokedAtIsNull(token)
                .orElseThrow(() -> new ResourceNotFoundException("Memory share", token));
        Memory memory = share.getMemory();
        if (!isActive(memory)) {
            throw new BusinessException("Memory is unavailable");
        }

        double distance = distanceMeters(request.getLatitude(), request.getLongitude(), memory.getLatitude(), memory.getLongitude());
        boolean revealed = distance <= unlockRadiusMeters;
        revealRepository.save(new MemoryReveal(memory.getId(), share.getId(), viewer.getId(), revealed, distanceBucket(distance)));
        if (revealed) {
            memoryGrantService.grantOnReveal(memory.getId(), viewer.getId(), share.getId());
        }
        productEventService.record(revealed ? "MEMORY_REVEALED" : "REVEAL_ATTEMPTED", viewer.getId(), memory.getId(), token, null);

        return MemoryRevealResponse.builder()
                .revealed(revealed)
                .distanceMeters(distance)
                .unlockRadiusMeters(unlockRadiusMeters)
                .memory(revealed ? toResponse(memory, viewer.getId()) : null)
                .build();
    }

    /**
     * Reveal a DIRECT in-app share by memory id (these have no share token).
     * Mirrors {@link #revealShare}: the recipient must hold an active grant for
     * the memory and be within the unlock radius. Only then is revealed_at set
     * and the contents returned. An already-unlocked grant stays unlocked.
     */
    @Transactional
    public MemoryRevealResponse revealDirectShare(String auth0Subject, UUID memoryId, MemoryRevealRequest request) {
        User viewer = userService.findByAuth0Subject(auth0Subject);
        Memory memory = memoryRepository.findById(memoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Memory", memoryId));
        if (!isActive(memory)) {
            throw new BusinessException("Memory is unavailable");
        }
        // Must have been shared with this viewer — no grant, nothing to reveal.
        MemoryGrant grant = memoryGrantRepository
                .findByMemoryIdAndBeneficiaryUserId(memoryId, viewer.getId())
                .filter(g -> g.getRemovedAt() == null)
                .orElseThrow(() -> new ResourceNotFoundException("Memory grant", memoryId));

        double distance = distanceMeters(request.getLatitude(), request.getLongitude(),
                memory.getLatitude(), memory.getLongitude());
        boolean withinRange = distance <= unlockRadiusMeters;
        revealRepository.save(new MemoryReveal(
                memory.getId(), grant.getShareId(), viewer.getId(), withinRange, distanceBucket(distance)));
        if (withinRange && grant.getRevealedAt() == null) {
            grant.setRevealedAt(Instant.now());
        }
        // Once unlocked, it stays unlocked even if the viewer later moves away.
        boolean revealed = grant.getRevealedAt() != null;
        productEventService.record(withinRange ? "MEMORY_REVEALED" : "REVEAL_ATTEMPTED",
                viewer.getId(), memory.getId(), null, null);

        return MemoryRevealResponse.builder()
                .revealed(revealed)
                .distanceMeters(distance)
                .unlockRadiusMeters(unlockRadiusMeters)
                .memory(revealed ? toResponse(memory, viewer.getId()) : null)
                .build();
    }

    @Transactional
    public void hideCreatorPublicMemories(String auth0Subject, UUID creatorId) {
        User viewer = userService.findByAuth0Subject(auth0Subject);
        if (viewer.getId().equals(creatorId)) {
            throw new BusinessException("Cannot hide your own public memories");
        }
        userService.findById(creatorId);
        MemoryCreatorVisibilityPreference preference = visibilityPreferenceRepository
                .findByViewerIdAndCreatorId(viewer.getId(), creatorId)
                .orElseGet(() -> new MemoryCreatorVisibilityPreference(viewer.getId(), creatorId, true));
        preference.setHidePublicMemories(true);
        visibilityPreferenceRepository.save(preference);
    }

    @Transactional
    public void showCreatorPublicMemories(String auth0Subject, UUID creatorId) {
        User viewer = userService.findByAuth0Subject(auth0Subject);
        visibilityPreferenceRepository.findByViewerIdAndCreatorId(viewer.getId(), creatorId)
                .ifPresent(preference -> {
                    preference.setHidePublicMemories(false);
                    visibilityPreferenceRepository.save(preference);
                });
    }

    private Memory findOwnedMemory(UUID viewerId, UUID memoryId) {
        Memory memory = memoryRepository.findById(memoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Memory", memoryId));
        if (!memory.getCreatorId().equals(viewerId) || memory.getDeletedAt() != null) {
            throw new ResourceNotFoundException("Memory", memoryId);
        }
        return memory;
    }

    private void enforceDailyLimit(UUID creatorId) {
        long count = memoryRepository.countByCreatorIdAndDeletedAtIsNullAndCreatedAtAfter(
                creatorId, Instant.now().minus(1, ChronoUnit.DAYS));
        if (count >= dailyCreateLimit) {
            throw new BusinessException("Daily memory creation limit reached");
        }
    }

    private void validateText(String text) {
        if (text == null || text.isBlank()) {
            throw new BusinessException("Memory text is required");
        }
        String normalized = text.toLowerCase(Locale.ROOT);
        for (String term : blockedTerms == null ? List.<String>of() : blockedTerms) {
            String candidate = term == null ? "" : term.trim().toLowerCase(Locale.ROOT);
            if (!candidate.isEmpty() && normalized.contains(candidate)) {
                throw new BusinessException("Memory text contains blocked language");
            }
        }
    }

    private void replaceMedia(Memory memory, List<MemoryMediaRequest> mediaRequests, UUID ownerId) {
        memory.getMedia().clear();
        if (mediaRequests == null) {
            return;
        }
        int position = 0;
        Set<MemoryMediaType> seen = EnumSet.noneOf(MemoryMediaType.class);
        for (MemoryMediaRequest request : mediaRequests) {
            if (!seen.add(request.getMediaType())) {
                throw new BusinessException("Only one image and one audio file are supported per memory");
            }
            validateMemoryMedia(request, ownerId);
            MemoryMedia media = new MemoryMedia(memory, request.getMediaType(), request.getUrl(), position++);
            media.setObjectName(request.getObjectName());
            media.setContentType(request.getContentType());
            media.setSizeBytes(request.getSizeBytes());
            memory.getMedia().add(media);
        }
    }

    private List<MemoryMapPinResponse> toMapPins(List<Memory> memories, UUID viewerId) {
        if (memories.isEmpty()) {
            return List.of();
        }
        List<UUID> memoryIds = memories.stream().map(Memory::getId).toList();
        Set<UUID> grantedIds = new HashSet<>(memoryGrantRepository.findActiveGrantedMemoryIdsForBeneficiary(viewerId, memoryIds));
        Set<UUID> revealedIds = new HashSet<>(memoryGrantRepository.findRevealedGrantedMemoryIdsForBeneficiary(viewerId, memoryIds));
        Set<UUID> creatorIds = memories.stream().map(Memory::getCreatorId).collect(Collectors.toSet());
        Map<UUID, User> users = userService.findAllByIds(creatorIds);
        Map<UUID, UserProfile> profiles = profileRepository.findAllByUserIdIn(creatorIds).stream()
                .collect(Collectors.toMap(UserProfile::getUserId, p -> p));

        return memories.stream()
                .map(memory -> {
                    CreatorSummary creator = creatorSummary(memory.getCreatorId(), users, profiles);
                    // Content is shown only when the viewer is entitled WITHOUT a
                    // location gate (owns it, or it's a public followers memory) or
                    // has unlocked the share by reaching it. A granted-but-unrevealed
                    // share stays a locked teaser: redact text + media indicators.
                    boolean revealed = contentVisible(memory, viewerId, revealedIds);
                    boolean hasImage = revealed && memory.getMedia().stream().anyMatch(media -> media.getMediaType() == MemoryMediaType.IMAGE);
                    boolean hasAudio = revealed && memory.getMedia().stream().anyMatch(media -> media.getMediaType() == MemoryMediaType.AUDIO);
                    return MemoryMapPinResponse.builder()
                            .id(memory.getId())
                            .creatorId(memory.getCreatorId())
                            .creatorUsername(creator.username())
                            .creatorDisplayName(creator.displayName())
                            .creatorAvatarUrl(creator.avatarUrl())
                            .textPreview(revealed ? preview(memory.getTextContent()) : null)
                            .latitude(memory.getLatitude())
                            .longitude(memory.getLongitude())
                            .placeLabel(memory.getPlaceLabel())
                            .visibility(memory.getVisibility())
                            .ownedByViewer(memory.getCreatorId().equals(viewerId))
                            .sharedWithViewer(grantedIds.contains(memory.getId()))
                            .revealed(revealed)
                            .hasImage(hasImage)
                            .hasAudio(hasAudio)
                            .createdAt(memory.getCreatedAt())
                            .build();
                })
                .toList();
    }

    /**
     * Whether {@code viewer} may see this memory's contents. True when they own
     * it, when it's a public followers memory (never geo-locked), or when they
     * hold a revealed grant (unlocked by reaching the location). A granted-but-
     * unrevealed direct share returns false → contents are redacted.
     */
    private boolean contentVisible(Memory memory, UUID viewerId, Set<UUID> revealedGrantIds) {
        return memory.getCreatorId().equals(viewerId)
                || memory.getVisibility() == MemoryVisibility.FOLLOWERS_PUBLIC
                || revealedGrantIds.contains(memory.getId());
    }

    private static List<Memory> orderByIds(List<Memory> memories, List<UUID> orderedIds) {
        Map<UUID, Memory> byId = memories.stream().collect(Collectors.toMap(Memory::getId, memory -> memory));
        return orderedIds.stream()
                .map(byId::get)
                .filter(Objects::nonNull)
                .toList();
    }

    /** Full response — for owner-only paths where content is always visible. */
    private MemoryResponse toResponse(Memory memory, UUID viewerId) {
        return toResponse(memory, viewerId, true);
    }

    /**
     * Build a memory response, redacting contents when {@code contentVisible} is
     * false (a shared memory not yet unlocked by reaching its location). Location
     * and creator stay visible so the recipient can navigate there; textContent
     * and media are withheld until reveal.
     */
    private MemoryResponse toResponse(Memory memory, UUID viewerId, boolean contentVisible) {
        CreatorSummary creator = creatorSummary(memory.getCreatorId());
        return MemoryResponse.builder()
                .id(memory.getId())
                .creatorId(memory.getCreatorId())
                .creatorUsername(creator.username())
                .creatorDisplayName(creator.displayName())
                .creatorAvatarUrl(creator.avatarUrl())
                .textContent(contentVisible ? memory.getTextContent() : null)
                .latitude(memory.getLatitude())
                .longitude(memory.getLongitude())
                .placeLabel(memory.getPlaceLabel())
                .visibility(memory.getVisibility())
                .expiresAt(memory.getExpiresAt())
                .media(contentVisible
                        ? memory.getMedia().stream().map(this::toMediaResponse).toList()
                        : List.of())
                .ownedByViewer(memory.getCreatorId().equals(viewerId))
                .revealed(contentVisible)
                .parentMemoryId(memory.getParentMemoryId())
                .replyCount((int) memoryRepository.countByParentMemoryIdAndDeletedAtIsNull(memory.getId()))
                .createdAt(memory.getCreatedAt())
                .updatedAt(memory.getUpdatedAt())
                .build();
    }

    private MemoryMediaResponse toMediaResponse(MemoryMedia media) {
        return MemoryMediaResponse.builder()
                .id(media.getId())
                .mediaType(media.getMediaType())
                .url(media.getUrl())
                .contentType(media.getContentType())
                .sizeBytes(media.getSizeBytes())
                .build();
    }

    private CreatorSummary creatorSummary(UUID creatorId) {
        User user = userService.findById(creatorId);
        UserProfile profile = profileRepository.findByUserId(creatorId).orElse(null);
        Map<UUID, User> users = new HashMap<>();
        users.put(creatorId, user);
        Map<UUID, UserProfile> profiles = new HashMap<>();
        if (profile != null) {
            profiles.put(creatorId, profile);
        }
        return creatorSummary(creatorId, users, profiles);
    }

    private CreatorSummary creatorSummary(UUID creatorId, Map<UUID, User> users, Map<UUID, UserProfile> profiles) {
        User user = users.get(creatorId);
        UserProfile profile = profiles.get(creatorId);
        String username = user != null ? user.getUsername() : null;
        String displayName = profile != null && profile.getDisplayName() != null && !profile.getDisplayName().isBlank()
                ? profile.getDisplayName()
                : (username != null ? username : "Brooks user");
        return new CreatorSummary(username, displayName, profile != null ? profile.getAvatarUrl() : null);
    }

    private boolean isActive(Memory memory) {
        return memory.getDeletedAt() == null && (memory.getExpiresAt() == null || memory.getExpiresAt().isAfter(Instant.now()));
    }

    private static void validateFutureExpiration(Instant expiresAt) {
        if (expiresAt != null && !expiresAt.isAfter(Instant.now())) {
            throw new BusinessException("Memory expiration must be in the future");
        }
    }

    private static void validateBounds(double north, double south, double east, double west) {
        if (north < south || north > 90 || south < -90 || east < -180 || east > 180 || west < -180 || west > 180) {
            throw new BusinessException("Invalid map bounds");
        }
    }

    private static void validateMemoryMedia(MemoryMediaRequest request, UUID ownerId) {
        if (request.getMediaType() == null) {
            throw new BusinessException("Memory media type is required");
        }
        String objectName = request.getObjectName();
        if (objectName == null || objectName.isBlank()) {
            throw new BusinessException("Memory media must be uploaded through Brooks before it can be attached");
        }

        String expectedPrefix = request.getMediaType() == MemoryMediaType.IMAGE
                ? "memories/images/" + ownerId + "/"
                : "memories/audio/" + ownerId + "/";
        if (!objectName.replace("\\", "/").startsWith(expectedPrefix)) {
            throw new BusinessException("Memory media does not belong to this user");
        }

        String contentType = request.getContentType();
        if (contentType == null || contentType.isBlank()) {
            return;
        }
        boolean validType = request.getMediaType() == MemoryMediaType.IMAGE
                ? contentType.startsWith("image/")
                : contentType.startsWith("audio/");
        if (!validType) {
            throw new BusinessException("Memory media content type does not match the media type");
        }
    }

    private static String preview(String value) {
        return value.length() <= 80 ? value : value.substring(0, 77) + "...";
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static MemoryShareTeaserResponse unavailableTeaser(String token, String reason) {
        return MemoryShareTeaserResponse.builder()
                .token(token)
                .available(false)
                .unavailableReason(reason)
                .build();
    }

    private static String generateToken() {
        StringBuilder token = new StringBuilder(32);
        for (int i = 0; i < 32; i++) {
            token.append(TOKEN_ALPHABET.charAt(SECURE_RANDOM.nextInt(TOKEN_ALPHABET.length())));
        }
        return token.toString();
    }

    private static double distanceMeters(double lat1, double lng1, double lat2, double lng2) {
        double earthRadiusMeters = 6_371_000;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return earthRadiusMeters * c;
    }

    private static String distanceBucket(double distanceMeters) {
        if (distanceMeters <= 50) return "WITHIN_50M";
        if (distanceMeters <= 250) return "WITHIN_250M";
        if (distanceMeters <= 1000) return "WITHIN_1KM";
        return "OVER_1KM";
    }

    private record CreatorSummary(String username, String displayName, String avatarUrl) {
    }
}
