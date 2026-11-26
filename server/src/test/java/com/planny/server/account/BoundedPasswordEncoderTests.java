package com.planny.server.account;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicInteger;
import org.jspecify.annotations.Nullable;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

class BoundedPasswordEncoderTests {

    @Test
    void hashesAtMostTheAllowedNumberAtOnce() {
        var running = new AtomicInteger();
        var maxRunning = new AtomicInteger();
        PasswordEncoder slowEncoder = new PasswordEncoder() {
            @Override
            public String encode(@Nullable CharSequence rawPassword) {
                maxRunning.accumulateAndGet(running.incrementAndGet(), Math::max);
                try {
                    Thread.sleep(20);
                }
                catch (InterruptedException ex) {
                    Thread.currentThread().interrupt();
                }
                running.decrementAndGet();
                return "hash";
            }

            @Override
            public boolean matches(@Nullable CharSequence rawPassword, @Nullable String encodedPassword) {
                return true;
            }
        };
        var encoder = new BoundedPasswordEncoder(slowEncoder, 2);

        List<Future<?>> hashes = new ArrayList<>();
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            for (int i = 0; i < 20; i++) {
                hashes.add(executor.submit(() -> encoder.encode("password")));
            }
        }

        assertThat(hashes).allSatisfy(hash -> assertThat(hash).succeedsWithin(Duration.ofSeconds(5)));
        assertThat(maxRunning.get()).isBetween(1, 2);
    }
}
