package com.planny.server.account;

import java.util.concurrent.Semaphore;
import java.util.function.Supplier;
import org.jspecify.annotations.Nullable;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Argon2는 해시 한 번에 메모리를 19 MiB 쓴다. 가상 스레드로 가입, 로그인 요청이 한꺼번에 몰려도
 * 메모리가 모자라지 않게, 동시에 계산하는 해시 수를 제한한다. 나머지 요청은 차례를 기다린다.
 */
final class BoundedPasswordEncoder implements PasswordEncoder {

    private final PasswordEncoder delegate;

    private final Semaphore permits;

    BoundedPasswordEncoder(PasswordEncoder delegate, int maxConcurrentHashes) {
        this.delegate = delegate;
        this.permits = new Semaphore(maxConcurrentHashes);
    }

    @Override
    public @Nullable String encode(@Nullable CharSequence rawPassword) {
        return limited(() -> delegate.encode(rawPassword));
    }

    @Override
    public boolean matches(@Nullable CharSequence rawPassword, @Nullable String encodedPassword) {
        return limited(() -> delegate.matches(rawPassword, encodedPassword));
    }

    @Override
    public boolean upgradeEncoding(@Nullable String encodedPassword) {
        return delegate.upgradeEncoding(encodedPassword);
    }

    private <T> T limited(Supplier<T> hashing) {
        permits.acquireUninterruptibly();
        try {
            return hashing.get();
        }
        finally {
            permits.release();
        }
    }
}
