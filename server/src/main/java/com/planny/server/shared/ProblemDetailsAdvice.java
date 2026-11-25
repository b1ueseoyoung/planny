package com.planny.server.shared;

import java.net.URI;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import org.jspecify.annotations.Nullable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.MessageSourceResolvable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.validation.method.ParameterErrors;
import org.springframework.validation.method.ParameterValidationResult;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.ServletWebRequest;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;
import tools.jackson.core.JacksonException;

/**
 * 모든 오류를 RFC 9457 Problem Details(application/problem+json)로 답한다.
 * 응답에는 항상 code가 있고, 입력값 오류(400)에는 어떤 필드가 왜 틀렸는지 errors가 붙는다.
 */
@RestControllerAdvice
class ProblemDetailsAdvice extends ResponseEntityExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(ProblemDetailsAdvice.class);

    private static final String INVALID_VALUE = "값이 올바르지 않습니다";

    @Override
    protected @Nullable ResponseEntity<Object> handleMethodArgumentNotValid(
            MethodArgumentNotValidException ex, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        List<FieldViolation> violations = ex.getBindingResult().getFieldErrors().stream()
                .map(ProblemDetailsAdvice::violation)
                .toList();
        return handleExceptionInternal(ex, validationProblem(violations), headers, status, request);
    }

    @Override
    protected @Nullable ResponseEntity<Object> handleHandlerMethodValidationException(
            HandlerMethodValidationException ex, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        List<FieldViolation> violations = new ArrayList<>();
        for (ParameterValidationResult result : ex.getParameterValidationResults()) {
            if (result instanceof ParameterErrors errors) {
                errors.getFieldErrors().forEach(error -> violations.add(violation(error)));
            }
            else {
                String parameter = Objects.requireNonNullElse(result.getMethodParameter().getParameterName(), "");
                for (MessageSourceResolvable error : result.getResolvableErrors()) {
                    violations.add(new FieldViolation(parameter,
                            Objects.requireNonNullElse(error.getDefaultMessage(), INVALID_VALUE)));
                }
            }
        }
        return handleExceptionInternal(ex, validationProblem(violations), headers, status, request);
    }

    @Override
    protected @Nullable ResponseEntity<Object> handleHttpMessageNotReadable(
            HttpMessageNotReadableException ex, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(status,
                "요청 본문을 읽을 수 없습니다. JSON 형식과 값을 확인해 주세요.");
        problem.setProperty("code", "MALFORMED_REQUEST");
        JacksonException jsonError = findJacksonException(ex);
        if (jsonError != null && !jsonError.getPath().isEmpty()) {
            problem.setProperty("errors", List.of(new FieldViolation(jsonPath(jsonError),
                    "형식이 맞지 않거나 허용되지 않는 값입니다")));
        }
        return handleExceptionInternal(ex, problem, headers, status, request);
    }

    /** 예상하지 못한 오류. 내부 정보는 로그에만 남기고 응답에는 담지 않는다. */
    @ExceptionHandler
    @Nullable ResponseEntity<Object> handleUnexpected(Exception ex, WebRequest request) {
        log.error("처리하지 못한 오류: {}", request.getDescription(false), ex);
        HttpStatus status = HttpStatus.INTERNAL_SERVER_ERROR;
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(status,
                "서버에서 오류가 났습니다. 잠시 후 다시 시도해 주세요.");
        problem.setProperty("code", "INTERNAL_ERROR");
        return handleExceptionInternal(ex, problem, new HttpHeaders(), status, request);
    }

    @Override
    protected ResponseEntity<Object> createResponseEntity(
            @Nullable Object body, HttpHeaders headers, HttpStatusCode statusCode, WebRequest request) {
        if (body instanceof ProblemDetail problem) {
            if (problem.getInstance() == null && request instanceof ServletWebRequest servletRequest) {
                problem.setInstance(URI.create(servletRequest.getRequest().getRequestURI()));
            }
            // Spring이 만든 오류(405, 415 등)에도 code를 채워서 모든 오류 응답의 모양을 같게 한다
            var properties = problem.getProperties();
            if (properties == null || !properties.containsKey("code")) {
                HttpStatus status = HttpStatus.resolve(statusCode.value());
                problem.setProperty("code", status != null ? status.name() : "ERROR");
            }
        }
        return super.createResponseEntity(body, headers, statusCode, request);
    }

    private static ProblemDetail validationProblem(List<FieldViolation> violations) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "입력값을 확인해 주세요.");
        problem.setProperty("code", "VALIDATION_FAILED");
        problem.setProperty("errors", violations);
        return problem;
    }

    private static FieldViolation violation(FieldError error) {
        return new FieldViolation(error.getField(), Objects.requireNonNullElse(error.getDefaultMessage(), INVALID_VALUE));
    }

    private static @Nullable JacksonException findJacksonException(Throwable ex) {
        for (Throwable cause = ex.getCause(); cause != null; cause = cause.getCause()) {
            if (cause instanceof JacksonException jacksonException) {
                return jacksonException;
            }
        }
        return null;
    }

    /** ["items", 0, "amount"] 경로를 "items[0].amount"로 바꾼다. */
    private static String jsonPath(JacksonException ex) {
        StringBuilder path = new StringBuilder();
        for (JacksonException.Reference reference : ex.getPath()) {
            String property = reference.getPropertyName();
            if (property != null) {
                if (!path.isEmpty()) {
                    path.append('.');
                }
                path.append(property);
            }
            else if (reference.getIndex() >= 0) {
                path.append('[').append(reference.getIndex()).append(']');
            }
        }
        return path.toString();
    }
}
