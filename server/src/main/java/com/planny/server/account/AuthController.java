package com.planny.server.account;

import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

// 토큰 없이 부르는 API
@SecurityRequirements
@Tag(name = "인증")
@RestController
@RequestMapping(path = "/api/{version}/auth", version = "v1")
class AuthController {

    private final AuthService authService;

    AuthController(AuthService authService) {
        this.authService = authService;
    }

    /** 가입하고 바로 로그인한 상태의 토큰을 준다. */
    @PostMapping("/signup")
    @ResponseStatus(HttpStatus.CREATED)
    TokenResponse signup(@Valid @RequestBody SignupRequest request) {
        return authService.signup(request);
    }

    @PostMapping("/login")
    TokenResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    /** 액세스 토큰이 만료되면 리프레시 토큰으로 새 토큰을 받는다. 리프레시 토큰도 새로 바뀐다. */
    @PostMapping("/refresh")
    TokenResponse refresh(@Valid @RequestBody RefreshTokenRequest request) {
        return authService.refresh(request.refreshToken());
    }

    /** 이 기기의 로그인을 끝낸다. 리프레시 토큰을 폐기하고, 이미 받은 액세스 토큰은 만료될 때까지 쓸 수 있다. */
    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void logout(@Valid @RequestBody RefreshTokenRequest request) {
        authService.logout(request.refreshToken());
    }
}
