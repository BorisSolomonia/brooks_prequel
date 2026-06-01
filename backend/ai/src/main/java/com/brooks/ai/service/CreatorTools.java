package com.brooks.ai.service;

import com.brooks.ai.provider.ToolSpec;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Tool/function schemas for the creator "Build with AI" assistant — the structured, native
 * tool-calling replacement for the old free-text {@code <action>} tags. Names map 1:1 to the
 * frontend's action types, so the existing apply layer is reused unchanged.
 */
public final class CreatorTools {

    private CreatorTools() {}

    public static List<ToolSpec> specs() {
        return List.of(
                new ToolSpec("update_guide",
                        "Update guide metadata. Include ONLY the fields the user asked to change.",
                        obj(props(
                                "title", str("Guide title"),
                                "description", str("Guide description"),
                                "primaryCity", str("Primary city"),
                                "region", str("Region"),
                                "country", str("Country"),
                                "coverImageUrl", str("Cover image URL (use a real image URL, e.g. Unsplash)"),
                                "priceCents", integer("Base price in minor units, e.g. 1400 = 14.00"),
                                "currency", enumStr("Base currency", "USD", "EUR", "GBP", "GEL"),
                                "travelerStage", enumStr("Traveler stage", "DREAMING", "PLANNING", "EXPERIENCING"),
                                "personas", arr("Audience personas", "SOLO", "FAMILY", "BUDGET", "LUXURY", "DIGITAL_NOMAD"),
                                "bestSeasonStartMonth", integer("Best season start month 1-12"),
                                "bestSeasonEndMonth", integer("Best season end month 1-12"),
                                "bestSeasonLabel", str("Best season label"),
                                "tags", arrStr("Tags")
                        ), List.of())),

                new ToolSpec("add_day", "Add a new day to the itinerary.",
                        obj(props("title", str("Day title"), "description", str("Day description")),
                                List.of("title"))),

                new ToolSpec("add_block", "Add a block to an existing day (dayNumber starts at 1).",
                        obj(props(
                                "dayNumber", integer("Target day (1-based); the day must already exist"),
                                "title", str("Block title"),
                                "description", str("Block description"),
                                "blockType", enumStr("Block type", "MORNING", "AFTERNOON", "EVENING", "FULL_DAY", "ACTIVITY"),
                                "suggestedStartMinute", integer("Suggested start time, minutes after midnight (e.g. 480 = 08:00)")
                        ), List.of("dayNumber", "title"))),

                new ToolSpec("add_place", "Add a place to an existing block (identified by dayNumber + blockTitle).",
                        obj(props(
                                "dayNumber", integer("Target day (1-based)"),
                                "blockTitle", str("Title of the existing block to add into"),
                                "name", str("Place name"),
                                "description", str("Short description"),
                                "address", str("Address"),
                                "category", enumStr("Category", "RESTAURANT", "CAFE", "ATTRACTION", "MUSEUM", "PARK", "SHOPPING", "ACCOMMODATION", "TRANSPORT", "OTHER"),
                                "priceLevel", enumStr("Price level", "FREE", "BUDGET", "MID_RANGE", "UPSCALE", "LUXURY"),
                                "suggestedStartMinute", integer("Start time, minutes after midnight"),
                                "suggestedDurationMinutes", integer("Duration in minutes"),
                                "latitude", number("Latitude"),
                                "longitude", number("Longitude"),
                                "photoQuery", str("A short 2-4 word photo SEARCH TERM for this place (e.g. 'Tbilisi sulphur baths'). The app fetches a real photo — do NOT invent image URLs.")
                        ), List.of("dayNumber", "blockTitle", "name"))),

                new ToolSpec("update_day", "Update an existing day's title/description.",
                        obj(props("dayNumber", integer("Day to update (1-based)"),
                                "title", str("New title"), "description", str("New description")),
                                List.of("dayNumber"))),

                new ToolSpec("update_block", "Update an existing block (identified by dayNumber + blockTitle).",
                        obj(props("dayNumber", integer("Day (1-based)"), "blockTitle", str("Current block title"),
                                "title", str("New title"), "description", str("New description"),
                                "blockType", enumStr("Block type", "MORNING", "AFTERNOON", "EVENING", "FULL_DAY", "ACTIVITY")),
                                List.of("dayNumber", "blockTitle"))),

                new ToolSpec("update_place", "Update an existing place (identified by dayNumber + blockTitle + placeName).",
                        obj(props("dayNumber", integer("Day (1-based)"), "blockTitle", str("Block title"),
                                "placeName", str("Current place name"),
                                "name", str("New name"), "description", str("New description"), "address", str("Address"),
                                "category", enumStr("Category", "RESTAURANT", "CAFE", "ATTRACTION", "MUSEUM", "PARK", "SHOPPING", "ACCOMMODATION", "TRANSPORT", "OTHER"),
                                "priceLevel", enumStr("Price level", "FREE", "BUDGET", "MID_RANGE", "UPSCALE", "LUXURY"),
                                "photoQuery", str("A short photo SEARCH TERM to set/replace the place photo. The app fetches a real photo — do NOT invent image URLs.")),
                                List.of("dayNumber", "blockTitle", "placeName"))),

                new ToolSpec("delete_day", "Delete a day (and its blocks/places).",
                        obj(props("dayNumber", integer("Day to delete (1-based)")), List.of("dayNumber"))),

                new ToolSpec("delete_block", "Delete a block (and its places).",
                        obj(props("dayNumber", integer("Day (1-based)"), "blockTitle", str("Block title to find it")),
                                List.of("dayNumber", "blockTitle"))),

                new ToolSpec("delete_place", "Delete a place.",
                        obj(props("dayNumber", integer("Day (1-based)"), "blockTitle", str("Block title"),
                                "placeName", str("Place name to find it")),
                                List.of("dayNumber", "blockTitle", "placeName")))
        );
    }

    // ── tiny JSON-schema builders ──────────────────────────────────────────────
    private static Map<String, Object> str(String desc) { return Map.of("type", "string", "description", desc); }
    private static Map<String, Object> integer(String desc) { return Map.of("type", "integer", "description", desc); }
    private static Map<String, Object> number(String desc) { return Map.of("type", "number", "description", desc); }

    private static Map<String, Object> enumStr(String desc, String... values) {
        return Map.of("type", "string", "description", desc, "enum", List.of(values));
    }

    private static Map<String, Object> arrStr(String desc) {
        return Map.of("type", "array", "description", desc, "items", Map.of("type", "string"));
    }

    private static Map<String, Object> arr(String desc, String... enumValues) {
        return Map.of("type", "array", "description", desc,
                "items", Map.of("type", "string", "enum", List.of(enumValues)));
    }

    private static Map<String, Object> props(Object... kv) {
        Map<String, Object> m = new LinkedHashMap<>();
        for (int i = 0; i < kv.length; i += 2) {
            m.put((String) kv[i], kv[i + 1]);
        }
        return m;
    }

    private static Map<String, Object> obj(Map<String, Object> properties, List<String> required) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("type", "object");
        m.put("properties", properties);
        m.put("required", required);
        return m;
    }
}
