package com.planny.server.account;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration(proxyBeanMethods = false)
class PasswordConfig {

    @Bean
    PasswordEncoder passwordEncoder() {
        // OWASP 권장값: Argon2id, 메모리 19 MiB, 반복 2번, 병렬 1
        var argon2 = new Argon2PasswordEncoder(16, 32, 1, 19 * 1024, 2);
        return new BoundedPasswordEncoder(argon2, Math.max(2, Runtime.getRuntime().availableProcessors()));
    }
}
