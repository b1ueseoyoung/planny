package com.planny.server.shared;

import java.time.LocalDate;
import org.jspecify.annotations.Nullable;

/** 목록 조회의 ?from=&to= 기간 (양 끝 포함). 빠진 쪽은 끝없이 열려 있다. */
public record DateRange(LocalDate from, LocalDate to) {

    // PostgreSQL date가 다룰 수 있는 범위 안의 값
    private static final LocalDate EARLIEST = LocalDate.of(1, 1, 1);

    private static final LocalDate LATEST = LocalDate.of(9999, 12, 31);

    public static DateRange of(@Nullable LocalDate from, @Nullable LocalDate to) {
        if (from != null && to != null && to.isBefore(from)) {
            throw ApiException.invalidField("to", "끝 날짜는 시작 날짜와 같거나 뒤여야 합니다.");
        }
        return new DateRange(from != null ? from : EARLIEST, to != null ? to : LATEST);
    }
}
