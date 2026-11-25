package com.planny.server.account;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.planny.server.MutableClock;
import com.planny.server.shared.ApiException;
import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;

class LoginAttemptLimiterTests {

    private static final String EMAIL = "me@example.com";

    private final MutableClock clock = new MutableClock(Instant.parse("2026-11-25T12:00:00Z"));

    private final LoginAttemptLimiter limiter = new LoginAttemptLimiter(
            new AuthProperties(Duration.ofDays(30), 5, Duration.ofMinutes(5), Duration.ofMinutes(15)), clock);

    @Test
    void allowsUpToFourFailures() {
        failTimes(4);

        assertThatCode(() -> limiter.checkAllowed(EMAIL)).doesNotThrowAnyException();
    }

    @Test
    void locksForFiveMinutesAfterFifthFailure() {
        failTimes(5);
        clock.advance(Duration.ofSeconds(10));

        assertThatThrownBy(() -> limiter.checkAllowed(EMAIL))
                .isInstanceOfSatisfying(ApiException.class, ex -> {
                    assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
                    assertThat(ex.getHeaders().getFirst(HttpHeaders.RETRY_AFTER)).isEqualTo("290");
                    assertThat(ex.getBody().getDetail()).contains("5분 뒤에");
                });

        clock.advance(Duration.ofMinutes(5));
        assertThatCode(() -> limiter.checkAllowed(EMAIL)).doesNotThrowAnyException();
    }

    @Test
    void keepsLockingWhileFailuresContinue() {
        failTimes(5);
        clock.advance(Duration.ofMinutes(5));

        limiter.recordFailure(EMAIL);

        assertThatThrownBy(() -> limiter.checkAllowed(EMAIL)).isInstanceOf(ApiException.class);
    }

    @Test
    void successResetsCount() {
        failTimes(4);
        limiter.recordSuccess(EMAIL);
        failTimes(4);

        assertThatCode(() -> limiter.checkAllowed(EMAIL)).doesNotThrowAnyException();
    }

    @Test
    void countStartsOverAfterQuietWindow() {
        failTimes(4);
        clock.advance(Duration.ofMinutes(16));
        limiter.recordFailure(EMAIL);

        assertThatCode(() -> limiter.checkAllowed(EMAIL)).doesNotThrowAnyException();
    }

    @Test
    void otherEmailsAreNotAffected() {
        failTimes(5);

        assertThatCode(() -> limiter.checkAllowed("other@example.com")).doesNotThrowAnyException();
    }

    private void failTimes(int times) {
        for (int i = 0; i < times; i++) {
            limiter.recordFailure(EMAIL);
        }
    }
}
