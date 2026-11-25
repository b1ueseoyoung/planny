package com.planny.server.schedule;

import com.planny.server.shared.Category;
import com.planny.server.shared.Won;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

/** 예측된 지출 항목 하나 (예: 저녁 식사 32,000원) */
public record PredictedItem(
        @NotNull Category category,
        @NotBlank @Size(max = 100) String label,
        @PositiveOrZero @Max(Won.MAX) long amount) {
}
