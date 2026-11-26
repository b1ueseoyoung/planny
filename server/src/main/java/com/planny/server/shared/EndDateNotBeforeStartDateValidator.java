package com.planny.server.shared;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import java.time.LocalDate;
import org.jspecify.annotations.Nullable;

class EndDateNotBeforeStartDateValidator implements ConstraintValidator<EndDateNotBeforeStartDate, DatePeriod> {

    @Override
    public boolean isValid(@Nullable DatePeriod period, ConstraintValidatorContext context) {
        if (period == null) {
            return true;
        }
        LocalDate start = period.startDate();
        LocalDate end = period.endDate();
        // 날짜가 빠진 경우는 @NotNull이 알려 준다
        if (start == null || end == null || !end.isBefore(start)) {
            return true;
        }
        context.disableDefaultConstraintViolation();
        context.buildConstraintViolationWithTemplate(context.getDefaultConstraintMessageTemplate())
                .addPropertyNode("endDate")
                .addConstraintViolation();
        return false;
    }
}
