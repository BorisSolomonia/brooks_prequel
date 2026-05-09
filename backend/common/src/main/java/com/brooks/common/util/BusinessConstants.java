package com.brooks.common.util;

public final class BusinessConstants {
    private BusinessConstants() {}

    public static final int DEFAULT_PAGE_SIZE = 20;
    public static final int MAX_PAGE_SIZE = 100;

    /** Locale code passed to BOG iPay's hosted checkout (Georgian). */
    public static final String BOG_IPAY_LOCALE_KA = "ka";

    /** ISO 4217 codes the platform recognises. BOG iPay only accepts GEL. */
    public static final String CURRENCY_GEL = "GEL";
    public static final String CURRENCY_USD = "USD";
}
