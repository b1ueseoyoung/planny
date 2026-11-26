package com.planny.server.account;

import com.planny.server.shared.JwtProperties;
import java.time.Clock;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

/** 로그인한 사용자에게 줄 액세스 토큰과 리프레시 토큰을 만든다. */
@Service
class TokenService {

    private final JwtEncoder jwtEncoder;

    private final JwtProperties jwtProperties;

    private final RefreshTokenService refreshTokens;

    private final AuthProperties authProperties;

    private final Clock clock;

    TokenService(JwtEncoder jwtEncoder, JwtProperties jwtProperties, RefreshTokenService refreshTokens,
            AuthProperties authProperties, Clock clock) {
        this.jwtEncoder = jwtEncoder;
        this.jwtProperties = jwtProperties;
        this.refreshTokens = refreshTokens;
        this.authProperties = authProperties;
        this.clock = clock;
    }

    /** 가입이나 로그인 직후 */
    TokenResponse startSession(UUID userId) {
        return tokens(refreshTokens.startFamily(userId));
    }

    /** 리프레시 토큰을 쓸 수 없으면 비어 있다 */
    Optional<TokenResponse> refresh(String rawRefreshToken) {
        return refreshTokens.rotate(rawRefreshToken).map(this::tokens);
    }

    void logout(String rawRefreshToken) {
        refreshTokens.revokeFamilyOf(rawRefreshToken);
    }

    private TokenResponse tokens(IssuedRefreshToken refreshToken) {
        Instant now = clock.instant();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(jwtProperties.issuer())
                .subject(refreshToken.userId().toString())
                .issuedAt(now)
                .expiresAt(now.plus(jwtProperties.accessTokenTtl()))
                .build();
        JwsHeader header = JwsHeader.with(SignatureAlgorithm.ES256).build();
        String accessToken = jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
        return new TokenResponse(
                accessToken,
                "Bearer",
                jwtProperties.accessTokenTtl().toSeconds(),
                refreshToken.value(),
                // 리프레시 토큰은 바꿀 때마다 유효 기간을 새로 센다
                authProperties.refreshTokenTtl().toSeconds());
    }
}
