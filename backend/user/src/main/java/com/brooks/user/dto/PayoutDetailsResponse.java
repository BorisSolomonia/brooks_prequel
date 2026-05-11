package com.brooks.user.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class PayoutDetailsResponse {
    private String payoutIban;
    private String payoutBeneficiaryName;
    private String payoutCurrency;
}
