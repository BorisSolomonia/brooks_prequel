package com.brooks.guide.dto;

import lombok.Getter;
import lombok.Setter;

import java.util.List;
import java.util.UUID;

@Getter
@Setter
public class GoogleCalendarSyncRequest {
    private List<UUID> acknowledgedLateItemIds;
}
