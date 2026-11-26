package com.planny.server.account;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.planny.server.shared.ApiException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.TimeUnit;
import org.jspecify.annotations.Nullable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

/**
 * 같은 이메일로 로그인에 연달아 실패하면 잠시 막아서 비밀번호를 하나씩 맞혀 보는 공격을 늦춘다.
 * 서버 한 대의 메모리에 센다. 서버를 여러 대로 늘리면 Redis 같은 공용 저장소로 옮겨야 한다.
 */
@Component
class LoginAttemptLimiter {

    private final AuthProperties properties;

    private final Clock clock;

    /** 이메일별 실패 기록. 서로 다른 이메일을 계속 보내도 메모리가 무한히 늘지 않게 크기를 제한한다. */
    private final Cache<String, Failures> failures;

    LoginAttemptLimiter(AuthProperties properties, Clock clock) {
        this.properties = properties;
        this.clock = clock;
        this.failures = Caffeine.newBuilder()
                .maximumSize(100_000)
                .expireAfterWrite(properties.loginFailureWindow())
                .ticker(() -> TimeUnit.MILLISECONDS.toNanos(clock.millis()))
                .build();
    }

    /** 막힌 상태면 429 Too Many Requests와 Retry-After(초)로 답한다. */
    void checkAllowed(String email) {
        Failures recorded = failures.getIfPresent(email);
        if (recorded == null) {
            return;
        }
        Duration remaining = recorded.remainingLockAt(clock.instant());
        if (remaining != null) {
            throw tooManyAttempts(remaining);
        }
    }

    void recordFailure(String email) {
        Instant now = clock.instant();
        failures.asMap().compute(email, (key, recorded) -> {
            int count = (recorded == null ? 0 : recorded.count()) + 1;
            Instant lockedUntil = count >= properties.maxLoginFailures() ? now.plus(properties.loginLockDuration()) : null;
            return new Failures(count, lockedUntil);
        });
    }

    void recordSuccess(String email) {
        failures.invalidate(email);
    }

    private static ApiException tooManyAttempts(Duration remaining) {
        long seconds = Math.max(1, (remaining.toMillis() + 999) / 1000);
        long minutes = (seconds + 59) / 60;
        var ex = new ApiException(HttpStatus.TOO_MANY_REQUESTS, "TOO_MANY_LOGIN_ATTEMPTS",
                "로그인에 여러 번 실패해서 잠시 막았습니다. " + minutes + "분 뒤에 다시 시도해 주세요.");
        ex.getHeaders().set(HttpHeaders.RETRY_AFTER, Long.toString(seconds));
        return ex;
    }

    private record Failures(int count, @Nullable Instant lockedUntil) {

        /** 막힌 상태면 남은 시간, 아니면 null */
        @Nullable Duration remainingLockAt(Instant now) {
            return (lockedUntil != null && now.isBefore(lockedUntil)) ? Duration.between(now, lockedUntil) : null;
        }
    }
}
