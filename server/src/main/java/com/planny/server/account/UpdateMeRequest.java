package com.planny.server.account;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import org.jspecify.annotations.Nullable;

/**
 * 보낸 필드만 바꾼다. 빠진 필드(null)는 그대로 둔다.
 *
 * @param userName 비우면 "나"
 * @param budget 한 달 생활비 예산 (원)
 */
record UpdateMeRequest(
        @Nullable @Size(max = 20) String userName,
        @Nullable @PositiveOrZero @Max(1_000_000_000_000L) Long budget) {
}
