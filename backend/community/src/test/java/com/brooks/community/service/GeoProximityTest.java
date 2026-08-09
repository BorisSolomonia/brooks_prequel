package com.brooks.community.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class GeoProximityTest {

    // Tbilisi, Freedom Square-ish reference point.
    private static final double LAT = 41.6934;
    private static final double LON = 44.8015;

    @Test
    void samePointIsZeroMeters() {
        assertThat(GeoProximity.haversineMeters(LAT, LON, LAT, LON)).isLessThan(0.001);
    }

    @Test
    void withinAcceptsAccuratePresenceInsideRadius() {
        // ~15 m north, 5 m accuracy, 50 m radius -> eligible.
        double near = LAT + 0.00013;
        assertThat(GeoProximity.within(LAT, LON, near, LON, 5, 50)).isTrue();
    }

    @Test
    void withinRejectsPresenceOutsideRadius() {
        // ~1.1 km away cannot be "here".
        double far = LAT + 0.01;
        assertThat(GeoProximity.within(LAT, LON, far, LON, 5, 50)).isFalse();
    }

    @Test
    void withinRejectsVagueFixEvenIfNominallyInside() {
        // Standing at the point but with a 200 m accuracy fix cannot prove a 50 m presence.
        assertThat(GeoProximity.within(LAT, LON, LAT, LON, 200, 50)).isFalse();
    }
}
