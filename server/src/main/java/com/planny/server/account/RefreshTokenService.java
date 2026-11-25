package com.planny.server.account;

import com.planny.server.shared.UuidV7;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.util.Base64;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 리프레시 토큰은 한 번 쓰면 새 토큰으로 바뀐다(rotation).
 * 이미 쓴 토큰이 다시 오면 누군가 토큰을 훔쳐 쓴 것으로 보고, 같은 로그인에서 이어진 토큰을 모두 폐기한다.
 */
@Service
class RefreshTokenService {

    private static final Logger log = LoggerFactory.getLogger(RefreshTokenService.class);

    private static final SecureRandom RANDOM = new SecureRandom();

    private final RefreshTokenRepository tokens;

    private final AuthProperties properties;

    private final Clock clock;

    RefreshTokenService(RefreshTokenRepository tokens, AuthProperties properties, Clock clock) {
        this.tokens = tokens;
        this.properties = properties;
        this.clock = clock;
    }

    /** 새로 로그인할 때 새 계열(family)을 시작한다. 이 사용자의 만료된 토큰은 이때 지운다. */
    @Transactional
    IssuedRefreshToken startFamily(UUID userId) {
        Instant now = clock.instant();
        tokens.deleteExpired(userId, now);
        return issue(userId, UuidV7.generate(), now);
    }

    /** 쓸 수 있는 토큰이면 새 토큰으로 바꾸고, 아니면 비어 있다. */
    @Transactional
    Optional<IssuedRefreshToken> rotate(String rawToken) {
        Optional<RefreshToken> found = tokens.findByTokenHash(hash(rawToken));
        if (found.isEmpty()) {
            return Optional.empty();
        }
        RefreshToken token = found.get();
        Instant now = clock.instant();
        if (token.isUsed() && !token.isRevoked()) {
            // 폐기 내용이 커밋되도록 예외를 던지지 않고 빈 값으로 돌려준다
            tokens.revokeFamily(token.getFamilyId(), now);
            log.warn("이미 쓴 리프레시 토큰이 다시 들어와서 같은 로그인의 토큰을 모두 폐기했습니다. userId={}", token.getUserId());
            return Optional.empty();
        }
        if (!token.isUsableAt(now)) {
            return Optional.empty();
        }
        token.markUsed(now);
        return Optional.of(issue(token.getUserId(), token.getFamilyId(), now));
    }

    /** 로그아웃: 이 토큰과 같은 로그인에서 이어진 토큰을 모두 폐기한다. 없는 토큰이어도 그대로 끝낸다. */
    @Transactional
    void revokeFamilyOf(String rawToken) {
        tokens.findByTokenHash(hash(rawToken))
                .ifPresent(token -> tokens.revokeFamily(token.getFamilyId(), clock.instant()));
    }

    private IssuedRefreshToken issue(UUID userId, UUID familyId, Instant now) {
        byte[] random = new byte[32];
        RANDOM.nextBytes(random);
        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(random);
        tokens.save(new RefreshToken(userId, familyId, hash(rawToken), now.plus(properties.refreshTokenTtl())));
        return new IssuedRefreshToken(userId, rawToken);
    }

    static byte[] hash(String rawToken) {
        try {
            return MessageDigest.getInstance("SHA-256").digest(rawToken.getBytes(StandardCharsets.UTF_8));
        }
        catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256을 쓸 수 없습니다.", ex);
        }
    }
}
