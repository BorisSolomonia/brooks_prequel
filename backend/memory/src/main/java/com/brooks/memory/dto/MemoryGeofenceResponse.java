package com.brooks.memory.dto;

import java.util.UUID;

/**
 * BOR-44 (Phase A): one geofence the caller's device should monitor — a memory
 * shared WITH them, at its coordinates, with the platform unlock radius and the
 * sharer's display name (for the "You are near a memory shared by [name]!"
 * notification copy). The native client (Phase B) registers these with the OS
 * geofencing APIs; until then the client sync no-ops.
 */
public record MemoryGeofenceResponse(
        UUID memoryId,
        double latitude,
        double longitude,
        double radiusMeters,
        String sharerName) {
}
