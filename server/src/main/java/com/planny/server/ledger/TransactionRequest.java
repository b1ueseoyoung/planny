package com.planny.server.ledger;

import com.planny.server.shared.Category;
import com.planny.server.shared.Won;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.UUID;
import org.jspecify.annotations.Nullable;

/**
 * 거래를 추가하거나 바꿀 때 보내는 내용 (types.ts의 Transaction에서 id만 뺀 모양).
 *
 * @param amount 원 단위, 항상 양수
 * @param eventId 일정 중에 쓴 돈이면 그 일정의 id
 */
public record TransactionRequest(
        @NotNull LocalDate date,
        @Positive @Max(Won.MAX) long amount,
        @NotNull Category category,
        @NotNull @Size(max = 100) String merchant,
        @Nullable UUID eventId) {
}
