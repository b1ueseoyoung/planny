package com.planny.server.shared;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 끝 날짜가 시작 날짜와 같거나 뒤인지 검사한다. 틀리면 endDate 필드의 오류로 알려 줘서,
 * 목록 안에 있으면 "events[3].endDate"처럼 어느 항목이 틀렸는지 나온다.
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
@Constraint(validatedBy = EndDateNotBeforeStartDateValidator.class)
public @interface EndDateNotBeforeStartDate {

    String message() default "끝 날짜는 시작 날짜와 같거나 뒤여야 합니다";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
