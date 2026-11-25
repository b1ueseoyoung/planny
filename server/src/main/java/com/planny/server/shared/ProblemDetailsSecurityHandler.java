package com.planny.server.shared;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.oauth2.server.resource.web.BearerTokenAuthenticationEntryPoint;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.web.servlet.HandlerExceptionResolver;

/**
 * 보안 필터에서 난 401, 403도 컨트롤러 오류와 같은 Problem Details 모양으로 답하도록
 * {@link ProblemDetailsAdvice}에 넘긴다.
 */
final class ProblemDetailsSecurityHandler implements AuthenticationEntryPoint, AccessDeniedHandler {

    private final AuthenticationEntryPoint bearerEntryPoint = new BearerTokenAuthenticationEntryPoint();

    private final HandlerExceptionResolver exceptionResolver;

    ProblemDetailsSecurityHandler(HandlerExceptionResolver exceptionResolver) {
        this.exceptionResolver = exceptionResolver;
    }

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
            AuthenticationException authException) throws IOException, ServletException {
        // RFC 6750의 WWW-Authenticate: Bearer 헤더를 먼저 붙인다
        bearerEntryPoint.commence(request, response, authException);
        exceptionResolver.resolveException(request, response, null, authException);
    }

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response,
            AccessDeniedException accessDeniedException) {
        exceptionResolver.resolveException(request, response, null, accessDeniedException);
    }
}
