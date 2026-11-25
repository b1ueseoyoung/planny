package com.planny.server.account;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * @param refreshTokenTtl 리프레시 토큰 유효 기간. 토큰을 바꿀 때마다 새로 센다
 */
@ConfigurationProperties("planny.auth")
record AuthProperties(@DefaultValue("30d") Duration refreshTokenTtl) {
}
