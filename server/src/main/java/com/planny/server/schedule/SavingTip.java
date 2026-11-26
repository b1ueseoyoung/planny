package com.planny.server.schedule;

import com.planny.server.shared.Won;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

/** 이 일정에서 아낄 수 있는 방법과 그 금액 */
public record SavingTip(
        @NotBlank @Size(max = 200) String label,
        @PositiveOrZero @Max(Won.MAX) long amount) {
}
