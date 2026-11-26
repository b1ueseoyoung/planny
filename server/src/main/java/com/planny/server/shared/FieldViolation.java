package com.planny.server.shared;

/** 400 응답의 errors 목록 한 줄. field는 "items[0].amount"처럼 요청 JSON 안의 위치다. */
public record FieldViolation(String field, String message) {
}
