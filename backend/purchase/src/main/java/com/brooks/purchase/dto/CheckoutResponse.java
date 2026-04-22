package com.brooks.purchase.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class CheckoutResponse {
    private String checkoutUrl;
    private String sessionId;
}
