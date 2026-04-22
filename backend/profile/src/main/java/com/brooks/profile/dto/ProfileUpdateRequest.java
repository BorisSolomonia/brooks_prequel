package com.brooks.profile.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ProfileUpdateRequest {
    @Size(max = 100)
    private String displayName;

    @Size(max = 50)
    private String username;

    @Size(max = 500)
    private String bio;

    private String avatarUrl;

    @Size(max = 100)
    private String region;

    private String interests;

    @DecimalMin("-90.0")
    @DecimalMax("90.0")
    private Double latitude;

    @DecimalMin("-180.0")
    @DecimalMax("180.0")
    private Double longitude;
}
