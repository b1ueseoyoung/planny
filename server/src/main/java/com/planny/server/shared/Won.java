package com.planny.server.shared;

/** 금액(원) 관련 상수 */
public final class Won {

    /** 받는 금액의 최댓값 (1조 원). 프론트의 JavaScript 숫자로도 정확히 다룰 수 있는 범위다 */
    public static final long MAX = 1_000_000_000_000L;

    private Won() {
    }
}
