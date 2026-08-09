package com.brooks.community.domain;

/**
 * Per-POI footfall tier. Only HIGH/MED places enter Right Now v1 — a LOW-footfall
 * place can leave a single responder de-anonymised (anonymity set of one), so it is
 * excluded until an activity floor is proven. See BOR86_RIGHT_NOW_DESIGN.md.
 */
public enum FootfallClass {
    LOW,
    MED,
    HIGH
}
