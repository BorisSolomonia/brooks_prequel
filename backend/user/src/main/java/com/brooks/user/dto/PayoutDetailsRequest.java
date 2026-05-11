package com.brooks.user.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PayoutDetailsRequest {

    // IBAN format: country code (2) + check digits (2) + BBAN (max 30). Total max 34.
    // Allow blank to clear the field. Trim is done in service.
    @Pattern(regexp = "^(|[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30})$", message = "Invalid IBAN format")
    @Size(max = 34)
    private String payoutIban;

    @Size(max = 255)
    private String payoutBeneficiaryName;

    @Pattern(regexp = "^(|[A-Z]{3})$", message = "Currency must be a 3-letter ISO code (e.g., GEL, USD, EUR)")
    @Size(max = 3)
    private String payoutCurrency;
}
