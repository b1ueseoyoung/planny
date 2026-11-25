package com.planny.server.schedule;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;
import org.jspecify.annotations.Nullable;

/**
 * AI(또는 목업)가 일정 문장을 보고 만든 예측 (types.ts의 EventPrediction). DB에는 jsonb로 저장한다.
 *
 * @param people 함께하는 사람 이름 (본인 제외). 예전에 만든 예측에는 없을 수 있다
 * @param reasons "지난 성수동 모임 3번 평균 47,000원"처럼 예측 근거
 */
public record EventPrediction(
        @NotBlank @Size(max = 200) String title,
        @NotNull LocalDate startDate,
        @NotNull LocalDate endDate,
        @NotNull EventType eventType,
        @Nullable @Size(max = 100) String location,
        @JsonInclude(JsonInclude.Include.NON_NULL) @Nullable @Size(max = 30) List<@NotBlank @Size(max = 30) String> people,
        @NotNull @Size(max = 50) List<@NotNull @Valid PredictedItem> items,
        @NotNull @Size(max = 20) List<@NotNull @Size(max = 500) String> reasons,
        @NotNull @Size(max = 20) List<@NotNull @Valid SavingTip> savingTips) {
}
