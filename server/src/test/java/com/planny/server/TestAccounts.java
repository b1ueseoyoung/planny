package com.planny.server;

import static org.assertj.core.api.Assertions.assertThat;

import com.jayway.jsonpath.JsonPath;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

/** 테스트마다 새 사용자를 만들어 테스트끼리 데이터가 섞이지 않게 한다. */
public final class TestAccounts {

    public static final String PASSWORD = "correct horse battery";

    private TestAccounts() {
    }

    public static SignedUp signUp(MockMvcTester mvc) {
        return signUp(mvc, "user-" + UUID.randomUUID() + "@example.com");
    }

    public static SignedUp signUp(MockMvcTester mvc, String email) {
        MvcTestResult result = mvc.post().uri("/api/v1/auth/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"email": "%s", "password": "%s"}""".formatted(email, PASSWORD))
                .exchange();
        assertThat(result).hasStatus(HttpStatus.CREATED);
        String body = new String(result.getResponse().getContentAsByteArray(), StandardCharsets.UTF_8);
        return new SignedUp(email, JsonPath.read(body, "$.accessToken"), JsonPath.read(body, "$.refreshToken"));
    }

    public record SignedUp(String email, String accessToken, String refreshToken) {

        public String bearer() {
            return "Bearer " + accessToken;
        }
    }
}
