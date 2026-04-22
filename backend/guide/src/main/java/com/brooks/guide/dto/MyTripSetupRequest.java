package com.brooks.guide.dto;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
public class MyTripSetupRequest {
    private LocalDate tripStartDate;
    private String tripTimezone;
    private List<MyTripItemUpdateRequest> items;
}
