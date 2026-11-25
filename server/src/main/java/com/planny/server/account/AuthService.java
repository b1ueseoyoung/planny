package com.planny.server.account;

import com.planny.server.shared.ApiException;
import java.util.Locale;
import java.util.Optional;
import org.jspecify.annotations.Nullable;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

/**
 * 가입과 로그인. 비밀번호 해시는 오래 걸려서 DB 트랜잭션 밖에서 계산하고,
 * DB에는 짧게 읽고 쓰기만 한다.
 */
@Service
class AuthService {

    static final String DEFAULT_USER_NAME = "나";

    /** 프론트 목업 데이터와 같은 기본 예산 */
    static final long DEFAULT_BUDGET = 1_200_000;

    private final UserRepository users;

    private final PasswordEncoder passwordEncoder;

    private final TokenService tokens;

    /** 없는 이메일로 로그인해도 비밀번호를 확인하는 시간이 같도록 쓰는 해시 */
    private final String dummyPasswordHash;

    AuthService(UserRepository users, PasswordEncoder passwordEncoder, TokenService tokens) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.tokens = tokens;
        this.dummyPasswordHash = encode("planny-dummy-password");
    }

    TokenResponse signup(SignupRequest request) {
        String email = normalizeEmail(request.email());
        if (users.existsByEmail(email)) {
            throw emailTaken();
        }
        User user = new User(email, encode(request.password()), userNameOrDefault(request.userName()), DEFAULT_BUDGET);
        try {
            users.save(user);
        }
        catch (DataIntegrityViolationException ex) {
            // 같은 이메일로 동시에 가입한 경우
            throw emailTaken();
        }
        return tokens.startSession(user.getId());
    }

    TokenResponse login(LoginRequest request) {
        Optional<User> user = users.findByEmail(normalizeEmail(request.email()));
        String passwordHash = user.map(User::getPasswordHash).orElse(dummyPasswordHash);
        boolean passwordMatches = passwordEncoder.matches(request.password(), passwordHash);
        if (user.isEmpty() || !passwordMatches) {
            // 이메일이 없는지 비밀번호가 틀렸는지 구분해서 알려 주지 않는다
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "이메일이나 비밀번호가 맞지 않습니다.");
        }
        return tokens.startSession(user.get().getId());
    }

    TokenResponse refresh(String refreshToken) {
        return tokens.refresh(refreshToken).orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED,
                "INVALID_REFRESH_TOKEN", "로그인이 만료됐습니다. 다시 로그인해 주세요."));
    }

    void logout(String refreshToken) {
        tokens.logout(refreshToken);
    }

    static String normalizeEmail(String email) {
        return email.strip().toLowerCase(Locale.ROOT);
    }

    private static String userNameOrDefault(@Nullable String userName) {
        return (userName == null || userName.isBlank()) ? DEFAULT_USER_NAME : userName.strip();
    }

    private String encode(String rawPassword) {
        String hash = passwordEncoder.encode(rawPassword);
        if (hash == null) {
            throw new IllegalStateException("비밀번호 해시를 만들지 못했습니다.");
        }
        return hash;
    }

    private static ApiException emailTaken() {
        return new ApiException(HttpStatus.CONFLICT, "EMAIL_TAKEN", "이미 가입된 이메일입니다.");
    }
}
