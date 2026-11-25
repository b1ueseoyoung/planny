package com.planny.server.shared;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.ErrorResponseException;

/**
 * 앱이 의도해서 내는 오류. RFC 9457 Problem Details로 응답하고,
 * 프론트가 경우를 나눌 수 있게 {@code code} 필드를 함께 보낸다.
 */
public class ApiException extends ErrorResponseException {

    public ApiException(HttpStatus status, String code, String detail) {
        super(status, problemDetail(status, code, detail), null);
    }

    /** 없거나 다른 사람의 데이터일 때. 존재 여부가 드러나지 않게 둘 다 404로 답한다. */
    public static ApiException notFound(String detail) {
        return new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", detail);
    }

    /** 요청 본문 검증(@Valid)으로는 잡을 수 없는 입력값 오류. 검증 오류와 같은 모양(errors)으로 답한다. */
    public static ApiException invalidField(String field, String message) {
        var ex = new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", "입력값을 확인해 주세요.");
        ex.getBody().setProperty("errors", List.of(new FieldViolation(field, message)));
        return ex;
    }

    private static ProblemDetail problemDetail(HttpStatus status, String code, String detail) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail);
        problem.setProperty("code", code);
        return problem;
    }
}
