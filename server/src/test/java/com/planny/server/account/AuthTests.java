package com.planny.server.account;

import static org.assertj.core.api.Assertions.assertThat;

import com.planny.server.TestAccounts;
import com.planny.server.TestcontainersConfiguration;
import java.time.Duration;
import java.util.Locale;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
class AuthTests {

    @Autowired
    MockMvcTester mvc;

    @Autowired
    JwtDecoder jwtDecoder;

    @Autowired
    JdbcClient jdbc;

    @Test
    void signupGivesAccessTokenForNewUser() {
        var user = TestAccounts.signUp(mvc);

        Jwt jwt = jwtDecoder.decode(user.accessToken());
        assertThat(jwt.getClaimAsString("iss")).isEqualTo("planny");
        assertThat(jwt.getHeaders()).containsEntry("alg", "ES256").containsKey("kid");
        assertThat(UUID.fromString(jwt.getSubject())).isEqualTo(userIdOf(user.email()));
        assertThat(Duration.between(jwt.getIssuedAt(), jwt.getExpiresAt())).isEqualTo(Duration.ofMinutes(15));
    }

    @Test
    void newUserGetsDefaultNameAndBudget() {
        var user = TestAccounts.signUp(mvc);

        var row = jdbc.sql("SELECT user_name, budget FROM users WHERE email = ?").param(user.email())
                .query((rs, n) -> rs.getString("user_name") + "/" + rs.getLong("budget")).single();
        assertThat(row).isEqualTo("나/1200000");
    }

    @Test
    void passwordIsStoredAsArgon2idHash() {
        var user = TestAccounts.signUp(mvc);

        String hash = jdbc.sql("SELECT password_hash FROM users WHERE email = ?").param(user.email())
                .query(String.class).single();
        assertThat(hash).startsWith("$argon2id$").doesNotContain(TestAccounts.PASSWORD);
    }

    @Test
    void emailIsUniqueIgnoringCase() {
        String email = "Case-" + UUID.randomUUID() + "@Example.com";
        TestAccounts.signUp(mvc, email);

        assertThat(post("/api/v1/auth/signup", """
                {"email": "%s", "password": "another password"}""".formatted(email.toLowerCase(Locale.ROOT))))
                .hasStatus(HttpStatus.CONFLICT)
                .bodyJson().extractingPath("$.code").isEqualTo("EMAIL_TAKEN");
    }

    @Test
    void signupValidatesInput() {
        assertThat(post("/api/v1/auth/signup", """
                {"email": "not-an-email", "password": "short", "userName": "%s"}""".formatted("가".repeat(21))))
                .hasStatus(HttpStatus.BAD_REQUEST)
                .bodyJson().extractingPath("$.errors[*].field").asArray()
                .containsExactlyInAnyOrder("email", "password", "userName");
    }

    @Test
    void loginWithCorrectPasswordGivesToken() {
        var user = TestAccounts.signUp(mvc);

        assertThat(post("/api/v1/auth/login", """
                {"email": "%s", "password": "%s"}""".formatted(user.email().toUpperCase(Locale.ROOT), TestAccounts.PASSWORD)))
                .hasStatusOk()
                .bodyJson()
                .isLenientlyEqualTo("""
                        {"tokenType": "Bearer", "expiresIn": 900}""");
    }

    @Test
    void loginFailureDoesNotRevealWhetherEmailExists() {
        var user = TestAccounts.signUp(mvc);

        var wrongPassword = post("/api/v1/auth/login", """
                {"email": "%s", "password": "wrong password"}""".formatted(user.email()));
        var unknownEmail = post("/api/v1/auth/login", """
                {"email": "nobody-%s@example.com", "password": "wrong password"}""".formatted(UUID.randomUUID()));

        assertThat(wrongPassword).hasStatus(HttpStatus.UNAUTHORIZED)
                .bodyJson().extractingPath("$.code").isEqualTo("INVALID_CREDENTIALS");
        assertThat(unknownEmail).hasStatus(HttpStatus.UNAUTHORIZED)
                .bodyJson().extractingPath("$.detail").isEqualTo("이메일이나 비밀번호가 맞지 않습니다.");
    }

    @Test
    void repeatedLoginFailuresAreTemporarilyBlocked() {
        var user = TestAccounts.signUp(mvc);
        String wrong = """
                {"email": "%s", "password": "wrong password"}""".formatted(user.email());
        for (int i = 0; i < 5; i++) {
            assertThat(post("/api/v1/auth/login", wrong)).hasStatus(HttpStatus.UNAUTHORIZED);
        }

        // 막힌 동안에는 맞는 비밀번호도 받지 않는다
        var blocked = post("/api/v1/auth/login", """
                {"email": "%s", "password": "%s"}""".formatted(user.email(), TestAccounts.PASSWORD));
        assertThat(blocked).hasStatus(HttpStatus.TOO_MANY_REQUESTS)
                .bodyJson().extractingPath("$.code").isEqualTo("TOO_MANY_LOGIN_ATTEMPTS");
        assertThat(blocked.getResponse().getHeader(HttpHeaders.RETRY_AFTER)).matches("\\d+");
    }

    @Test
    void apiNeedsValidAccessToken() {
        var user = TestAccounts.signUp(mvc);

        var noToken = mvc.get().uri("/api/v1/nothing-here").exchange();
        assertThat(noToken).hasStatus(HttpStatus.UNAUTHORIZED)
                .bodyJson().extractingPath("$.code").isEqualTo("UNAUTHORIZED");
        assertThat(noToken.getResponse().getHeader(HttpHeaders.WWW_AUTHENTICATE)).startsWith("Bearer");
        assertThat(mvc.get().uri("/api/v1/nothing-here").header(HttpHeaders.AUTHORIZATION, "Bearer forged.token.value"))
                .hasStatus(HttpStatus.UNAUTHORIZED)
                .bodyJson().extractingPath("$.code").isEqualTo("INVALID_TOKEN");
        // 토큰이 맞으면 인증은 통과하고, 없는 경로라서 404
        assertThat(mvc.get().uri("/api/v1/nothing-here").header(HttpHeaders.AUTHORIZATION, user.bearer()))
                .hasStatus(HttpStatus.NOT_FOUND);
    }

    @Test
    void jwksPublishesOnlyPublicKey() {
        assertThat(mvc.get().uri("/.well-known/jwks.json"))
                .hasStatusOk()
                .bodyJson()
                .satisfies(json -> {
                    assertThat(json).extractingPath("$.keys[0].kty").isEqualTo("EC");
                    assertThat(json).extractingPath("$.keys[0].crv").isEqualTo("P-256");
                    assertThat(json).doesNotHavePath("$.keys[0].d");
                });
    }

    private MvcTestResult post(String uri, String json) {
        return mvc.post().uri(uri).contentType(MediaType.APPLICATION_JSON).content(json).exchange();
    }

    private UUID userIdOf(String email) {
        return jdbc.sql("SELECT id FROM users WHERE email = ?").param(email.toLowerCase(Locale.ROOT)).query(UUID.class).single();
    }
}
