package com.brooks.app.media;

public enum MediaUsage {
    PROFILE_AVATAR("profiles"),
    GUIDE_COVER("guides/covers"),
    PLACE_IMAGE("guides/places");

    private final String pathPrefix;

    MediaUsage(String pathPrefix) {
        this.pathPrefix = pathPrefix;
    }

    public String pathPrefix() {
        return pathPrefix;
    }
}
