package com.planny.server.shared;

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

    private static ProblemDetail problemDetail(HttpStatus status, String code, String detail) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail);
        problem.setProperty("code", code);
        return problem;
    }
}
