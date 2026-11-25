package com.planny.server.shared;

import java.time.LocalDate;
import org.jspecify.annotations.Nullable;

/** 시작 날짜와 끝 날짜가 있는 요청. {@link EndDateNotBeforeStartDate}로 순서를 검사한다. */
public interface DatePeriod {

    @Nullable LocalDate startDate();

    @Nullable LocalDate endDate();
}
