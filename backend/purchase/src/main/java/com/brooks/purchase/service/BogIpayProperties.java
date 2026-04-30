package com.brooks.purchase.service;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "bog-ipay")
@Getter
@Setter
public class BogIpayProperties {

    private String clientId;

    private String secretKey;

    private String baseUrl = "https://ipay.ge/opay/api/v1";

    private String callbackPath = "/api/webhooks/bog-ipay";

    private String locale = "ka";

    private int connectTimeoutMs = 10_000;

    private int readTimeoutMs = 30_000;
}
