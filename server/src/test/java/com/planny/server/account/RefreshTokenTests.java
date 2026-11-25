package com.planny.server.account;

import static org.assertj.core.api.Assertions.assertThat;

import com.jayway.jsonpath.JsonPath;
import com.planny.server.TestAccounts;
import com.planny.server.TestcontainersConfiguration;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
class RefreshTokenTests {

    @Autowired
    MockMvcTester mvc;

    @Autowired
    JdbcClient jdbc;

    @Test
    void loginGivesRefreshTokenValidFor30Days() {
        var user = TestAccounts.signUp(mvc);

        assertThat(user.refreshToken()).matches("[A-Za-z0-9_-]{43}");
        assertThat(login(user.email())).bodyJson()
                .extractingPath("$.refreshTokenExpiresIn").isEqualTo(30 * 24 * 60 * 60);
    }

    @Test
    void refreshGivesNewTokensAndOldOneStopsWorking() {
        var user = TestAccounts.signUp(mvc);

        var refreshed = refresh(user.refreshToken());
        assertThat(refreshed).hasStatusOk();
        String newRefreshToken = refreshTokenOf(refreshed);
        assertThat(newRefreshToken).isNotEqualTo(user.refreshToken());

        assertThat(refresh(newRefreshToken)).hasStatusOk();
    }

    @Test
    void reusedRefreshTokenRevokesTheWholeLogin() {
        var user = TestAccounts.signUp(mvc);
        String next = refreshTokenOf(refresh(user.refreshToken()));

        // 훔친 사람이 예전 토큰을 다시 쓰면
        assertThat(refresh(user.refreshToken()))
                .hasStatus(HttpStatus.UNAUTHORIZED)
                .bodyJson().extractingPath("$.code").isEqualTo("INVALID_REFRESH_TOKEN");
        // 정상 사용자가 받은 다음 토큰까지 모두 막힌다
        assertThat(refresh(next)).hasStatus(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void logoutRevokesOnlyThatDevice() {
        var user = TestAccounts.signUp(mvc);
        String otherDevice = refreshTokenOf(login(user.email()));

        assertThat(post("/api/v1/auth/logout", user.refreshToken())).hasStatus(HttpStatus.NO_CONTENT);

        assertThat(refresh(user.refreshToken())).hasStatus(HttpStatus.UNAUTHORIZED);
        assertThat(refresh(otherDevice)).hasStatusOk();
    }

    @Test
    void logoutWithUnknownTokenStillSucceeds() {
        assertThat(post("/api/v1/auth/logout", "unknown-token")).hasStatus(HttpStatus.NO_CONTENT);
    }

    @Test
    void expiredRefreshTokenIsRejected() {
        var user = TestAccounts.signUp(mvc);
        jdbc.sql("UPDATE refresh_tokens SET expires_at = now() - interval '1 second' WHERE token_hash = ?")
                .param(RefreshTokenService.hash(user.refreshToken())).update();

        assertThat(refresh(user.refreshToken())).hasStatus(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void onlyHashOfRefreshTokenIsStored() {
        var user = TestAccounts.signUp(mvc);

        long matchingRows = jdbc.sql("SELECT count(*) FROM refresh_tokens WHERE token_hash = sha256(convert_to(?, 'UTF8'))")
                .param(user.refreshToken()).query(Long.class).single();
        assertThat(matchingRows).isEqualTo(1L);
    }

    private MvcTestResult login(String email) {
        return mvc.post().uri("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"email": "%s", "password": "%s"}""".formatted(email, TestAccounts.PASSWORD))
                .exchange();
    }

    private MvcTestResult refresh(String refreshToken) {
        return post("/api/v1/auth/refresh", refreshToken);
    }

    private MvcTestResult post(String uri, String refreshToken) {
        return mvc.post().uri(uri).contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"refreshToken": "%s"}""".formatted(refreshToken))
                .exchange();
    }

    private static String refreshTokenOf(MvcTestResult result) {
        return JsonPath.read(new String(result.getResponse().getContentAsByteArray(), StandardCharsets.UTF_8),
                "$.refreshToken");
    }
}
