package com.planny.server.backup;

import com.planny.server.shared.Won;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.util.List;

/**
 * PUT /app-data 본문 (types.ts의 AppData). 기기의 localStorage에 있던 값을 그대로 보내면 된다.
 *
 * @param userName 비우면 "나"
 * @param budget 한 달 생활비 예산 (원)
 */
record AppDataRequest(
        @NotNull @Size(max = 20) String userName,
        @PositiveOrZero @Max(Won.MAX) long budget,
        @NotNull @Size(max = 20_000) List<@NotNull @Valid ImportedTransaction> transactions,
        @NotNull @Size(max = 5_000) List<@NotNull @Valid ImportedEvent> events) {
}
