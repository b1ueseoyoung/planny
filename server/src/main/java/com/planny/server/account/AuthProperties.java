package com.planny.server.account;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * @param refreshTokenTtl 리프레시 토큰 유효 기간. 토큰을 바꿀 때마다 새로 센다
 * @param maxLoginFailures 이만큼 연달아 틀리면 로그인을 잠시 막는다
 * @param loginLockDuration 로그인을 막는 시간
 * @param loginFailureWindow 마지막 실패 뒤 이 시간 동안 실패가 없으면 횟수를 처음부터 센다
 */
@ConfigurationProperties("planny.auth")
record AuthProperties(
        @DefaultValue("30d") Duration refreshTokenTtl,
        @DefaultValue("5") int maxLoginFailures,
        @DefaultValue("5m") Duration loginLockDuration,
        @DefaultValue("15m") Duration loginFailureWindow) {
}
