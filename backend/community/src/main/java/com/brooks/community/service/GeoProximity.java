package com.brooks.community.service;

/**
 * Transient proximity math for Right Now eligibility. Coordinates passed in here live only
 * for the duration of the call and are NEVER persisted or logged — the caller keeps only the
 * boolean outcome. A fresh copy of the Haversine (rather than reusing the memory module's
 * private one) avoids refactoring a working subsystem.
 */
public final class GeoProximity {

    private static final double EARTH_RADIUS_METERS = 6_371_000d;

    private GeoProximity() {
    }

    /** Great-circle distance in metres between two lat/lng points. */
    public static double haversineMeters(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return EARTH_RADIUS_METERS * c;
    }

    /**
     * True only if the device is genuinely within {@code radiusMeters} of the place AND the GPS
     * fix is precise enough to trust (accuracy no larger than the radius — a vague fix can't
     * prove presence). Rejects a report claimed from far away or from a low-quality fix.
     */
    public static boolean within(double placeLat, double placeLon,
                                 double deviceLat, double deviceLon,
                                 double accuracyMeters, int radiusMeters) {
        if (accuracyMeters > radiusMeters) {
            return false;
        }
        return haversineMeters(placeLat, placeLon, deviceLat, deviceLon) <= radiusMeters;
    }
}
