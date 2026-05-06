package com.brooks.purchase.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class CheckoutRequest {

    @NotNull
    private UUID guideId;

    @AssertTrue(message = "You must accept the Terms, Privacy Policy and Refund Policy before paying")
    private boolean acceptedTerms;
}
