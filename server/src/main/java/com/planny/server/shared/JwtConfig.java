package com.planny.server.shared;

import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.jwk.Curve;
import com.nimbusds.jose.jwk.ECKey;
import com.nimbusds.jose.jwk.JWK;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import java.text.ParseException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

/** ES256 서명 키로 액세스 토큰을 만들고 검증한다. */
@Configuration(proxyBeanMethods = false)
class JwtConfig {

    private static final Logger log = LoggerFactory.getLogger(JwtConfig.class);

    @Bean
    JWKSet jwtKeys(JwtProperties properties) throws JOSEException {
        String keys = properties.keys();
        if (keys == null || keys.isBlank()) {
            if (!properties.allowEphemeralKey()) {
                throw new IllegalStateException(
                        "JWT 서명 키(PLANNY_JWT_KEYS)가 없습니다. ./gradlew -q generateJwtKey 로 만든 키를 넣어 주세요.");
            }
            log.warn("JWT 서명 키(PLANNY_JWT_KEYS)가 없어 임시 키를 만들었습니다. "
                    + "서버를 다시 시작하면 그동안 발급한 토큰은 모두 무효가 됩니다. 로컬 개발에서만 이렇게 쓰세요.");
            return new JWKSet(JwtKeyGenerator.newSigningKey());
        }
        return parse(keys);
    }

    @Bean
    JwtEncoder jwtEncoder(JWKSet jwtKeys) {
        // 서명은 첫 번째 키로만 한다. 헤더의 kid는 NimbusJwtEncoder가 채운다
        return new NimbusJwtEncoder(new ImmutableJWKSet<>(new JWKSet(jwtKeys.getKeys().getFirst())));
    }

    @Bean
    JwtDecoder jwtDecoder(JWKSet jwtKeys, JwtProperties properties) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSource(new ImmutableJWKSet<>(jwtKeys.toPublicJWKSet()))
                .jwsAlgorithm(SignatureAlgorithm.ES256)
                .build();
        decoder.setJwtValidator(JwtValidators.createDefaultWithIssuer(properties.issuer()));
        return decoder;
    }

    private static JWKSet parse(String json) {
        JWKSet jwkSet;
        try {
            jwkSet = JWKSet.parse(json);
        }
        catch (ParseException ex) {
            throw new IllegalStateException("PLANNY_JWT_KEYS가 JWKS(JSON) 형식이 아닙니다.", ex);
        }
        if (jwkSet.getKeys().isEmpty()) {
            throw new IllegalStateException("PLANNY_JWT_KEYS에 키가 없습니다.");
        }
        JWK signingKey = jwkSet.getKeys().getFirst();
        if (!(signingKey instanceof ECKey ecKey) || !Curve.P_256.equals(ecKey.getCurve()) || !ecKey.isPrivate()) {
            throw new IllegalStateException("PLANNY_JWT_KEYS의 첫 번째 키는 개인 키가 들어 있는 P-256 EC 키여야 합니다.");
        }
        if (signingKey.getKeyID() == null) {
            throw new IllegalStateException("PLANNY_JWT_KEYS의 키에는 kid가 있어야 합니다.");
        }
        return jwkSet;
    }
}
