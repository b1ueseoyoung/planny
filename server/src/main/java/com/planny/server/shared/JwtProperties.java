package com.planny.server.shared;

import java.time.Duration;
import org.jspecify.annotations.Nullable;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * 액세스 토큰(JWT) 설정.
 *
 * @param issuer 토큰의 iss
 * @param accessTokenTtl 액세스 토큰 유효 시간
 * @param keys 서명 키 JWKS(JSON). 첫 번째 키로 서명하고, 나머지는 키를 바꾸는 동안 예전 토큰을 검증하는 데만 쓴다.
 *             환경 변수 PLANNY_JWT_KEYS로 넣고, ./gradlew generateJwtKey 로 만든다.
 * @param allowEphemeralKey keys가 없을 때 임시 키로 실행할지. 컨테이너 이미지에서는 false로 둔다.
 */
@ConfigurationProperties("planny.jwt")
public record JwtProperties(
        @DefaultValue("planny") String issuer,
        @DefaultValue("15m") Duration accessTokenTtl,
        @Nullable String keys,
        @DefaultValue("true") boolean allowEphemeralKey) {
}
