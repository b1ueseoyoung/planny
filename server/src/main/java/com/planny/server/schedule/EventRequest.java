package com.planny.server.schedule;

import com.planny.server.shared.DatePeriod;
import com.planny.server.shared.EndDateNotBeforeStartDate;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;
import org.jspecify.annotations.Nullable;

/**
 * 일정을 추가하거나 바꿀 때 보내는 내용 (types.ts의 CalendarEvent에서 id만 뺀 모양).
 *
 * @param endDate 하루 일정이면 startDate와 같다
 * @param people 함께하는 사람 이름 (본인 제외). 없으면 빈 목록으로 저장한다
 * @param prediction 다가오는 일정의 예상 비용. 없으면 null
 */
@EndDateNotBeforeStartDate
public record EventRequest(
        @NotBlank @Size(max = 200) String title,
        @NotNull LocalDate startDate,
        @NotNull LocalDate endDate,
        @NotNull EventType eventType,
        @Nullable @Size(max = 100) String location,
        @Nullable @Size(max = 30) List<@NotBlank @Size(max = 30) String> people,
        @Nullable @Valid EventPrediction prediction,
        @Nullable PredictionSource source) implements DatePeriod {
}
