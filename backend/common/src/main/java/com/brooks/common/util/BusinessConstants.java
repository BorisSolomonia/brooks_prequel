package com.brooks.common.util;

public final class BusinessConstants {
    private BusinessConstants() {}

    public static final int DEFAULT_PAGE_SIZE = 20;
    public static final int MAX_PAGE_SIZE = 100;

    /** Locale code passed to BOG iPay's hosted checkout (Georgian). */
    public static final String BOG_IPAY_LOCALE_KA = "ka";

    /**
     * ISO 4217 codes. A guide's BASE/presentment currency (creator-set) may be any SUPPORTED one;
     * the buyer is always CHARGED in GEL (BOG iPay settles GEL only), converted at the NBG rate.
     */
    public static final String CURRENCY_GEL = "GEL";
    public static final String CURRENCY_USD = "USD";
    public static final String CURRENCY_EUR = "EUR";
    public static final String CURRENCY_GBP = "GBP";

    /** Currencies a creator may price a guide in (and that buyers may view prices in). */
    public static final java.util.Set<String> SUPPORTED_CURRENCIES =
            java.util.Set.of(CURRENCY_GEL, CURRENCY_USD, CURRENCY_EUR, CURRENCY_GBP);

    /** Default base currency when a creator doesn't pick one. */
    public static final String DEFAULT_BASE_CURRENCY = CURRENCY_USD;

    public static boolean isSupportedCurrency(String currency) {
        return currency != null && SUPPORTED_CURRENCIES.contains(currency.trim().toUpperCase());
    }
}
