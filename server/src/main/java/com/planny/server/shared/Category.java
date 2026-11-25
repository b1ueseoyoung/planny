package com.planny.server.shared;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/** 지출 카테고리 (types.ts의 CATEGORIES). JSON과 DB에는 소문자 코드로 쓴다. */
public enum Category {

    MEAL("meal"),
    CAFE("cafe"),
    DELIVERY("delivery"),
    GROCERY("grocery"),
    TRANSPORT("transport"),
    LODGING("lodging"),
    SHOPPING("shopping"),
    CULTURE("culture"),
    GIFT("gift"),
    SUBSCRIPTION("subscription"),
    ETC("etc");

    private final String code;

    Category(String code) {
        this.code = code;
    }

    @JsonValue
    public String code() {
        return code;
    }

    @JsonCreator
    public static Category fromCode(String code) {
        for (Category category : values()) {
            if (category.code.equals(code)) {
                return category;
            }
        }
        throw new IllegalArgumentException("없는 카테고리입니다: " + code);
    }
}
