package com.brooks.guide.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class MyTripsResponse {
    private List<MyTripSummaryResponse> trips;
}
