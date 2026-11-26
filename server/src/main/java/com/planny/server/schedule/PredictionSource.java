package com.planny.server.schedule;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/** 예측을 누가 만들었는지 (types.ts의 PredictionSource) */
public enum PredictionSource {

    AI("ai"),
    MOCK("mock");

    private final String code;

    PredictionSource(String code) {
        this.code = code;
    }

    @JsonValue
    public String code() {
        return code;
    }

    @JsonCreator
    public static PredictionSource fromCode(String code) {
        for (PredictionSource source : values()) {
            if (source.code.equals(code)) {
                return source;
            }
        }
        throw new IllegalArgumentException("없는 예측 출처입니다: " + code);
    }
}
