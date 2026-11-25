package com.planny.server.schedule;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/** 일정 종류 (types.ts의 EVENT_TYPES) */
public enum EventType {

    FRIENDS("friends"),
    DATE("date"),
    TRAVEL("travel"),
    PERFORMANCE("performance"),
    WORK("work"),
    FAMILY("family"),
    OTHER("other");

    private final String code;

    EventType(String code) {
        this.code = code;
    }

    @JsonValue
    public String code() {
        return code;
    }

    @JsonCreator
    public static EventType fromCode(String code) {
        for (EventType type : values()) {
            if (type.code.equals(code)) {
                return type;
            }
        }
        throw new IllegalArgumentException("없는 일정 종류입니다: " + code);
    }
}
