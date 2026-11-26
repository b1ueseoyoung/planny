package com.planny.server.shared;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import org.springframework.security.core.annotation.AuthenticationPrincipal;

/**
 * 요청을 보낸 사용자의 id(액세스 토큰의 sub). 컨트롤러 메서드의 UUID 매개변수에 붙인다.
 * <pre>{@code @GetMapping List<TransactionResponse> list(@CurrentUser UUID userId)}</pre>
 */
@Target(ElementType.PARAMETER)
@Retention(RetentionPolicy.RUNTIME)
@Documented
@AuthenticationPrincipal(expression = "T(java.util.UUID).fromString(subject)")
public @interface CurrentUser {
}
