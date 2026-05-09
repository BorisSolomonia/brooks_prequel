package com.brooks.purchase.service;

import com.brooks.common.util.BusinessConstants;
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

    private String oauthBaseUrl = "https://oauth2.bog.ge";

    private String apiBaseUrl = "https://api.bog.ge";

    private String callbackPath = "/api/webhooks/bog-ipay";

    private String locale = BusinessConstants.BOG_IPAY_LOCALE_KA;

    private int orderTtlMinutes = 30;

    private int connectTimeoutMs = 10_000;

    private int readTimeoutMs = 30_000;
}
