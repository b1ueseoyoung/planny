package com.planny.server.account;

import static org.assertj.core.api.Assertions.assertThat;

import com.planny.server.TestAccounts;
import com.planny.server.TestAccounts.SignedUp;
import com.planny.server.TestcontainersConfiguration;
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
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
class MeTests {

    @Autowired
    MockMvcTester mvc;

    @Autowired
    JdbcClient jdbc;

    @Test
    void showsMyProfile() {
        var user = TestAccounts.signUp(mvc);

        assertThat(mvc.get().uri("/api/v1/me").header(HttpHeaders.AUTHORIZATION, user.bearer()))
                .hasStatusOk()
                .bodyJson()
                .isStrictlyEqualTo("""
                        {"email": "%s", "userName": "나", "budget": 1200000}""".formatted(user.email()));
    }

    @Test
    void changesOnlyTheFieldsSent() {
        var user = TestAccounts.signUp(mvc);

        assertThat(patch(user, """
                {"userName": "  서영  ", "budget": 1500000}"""))
                .hasStatusOk()
                .bodyJson().isLenientlyEqualTo("""
                        {"userName": "서영", "budget": 1500000}""");
        assertThat(patch(user, """
                {"budget": 900000}"""))
                .bodyJson().isLenientlyEqualTo("""
                        {"userName": "서영", "budget": 900000}""");
        assertThat(patch(user, """
                {"userName": "   "}"""))
                .bodyJson().isLenientlyEqualTo("""
                        {"userName": "나", "budget": 900000}""");
    }

    @Test
    void rejectsInvalidChanges() {
        var user = TestAccounts.signUp(mvc);

        assertThat(patch(user, """
                {"userName": "%s", "budget": -1}""".formatted("가".repeat(21))))
                .hasStatus(HttpStatus.BAD_REQUEST)
                .bodyJson().extractingPath("$.errors[*].field").asArray()
                .containsExactlyInAnyOrder("userName", "budget");
    }

    @Test
    void deleteRemovesAccountAndAllData() {
        var user = TestAccounts.signUp(mvc);
        UUID userId = userIdOf(user);
        UUID eventId = UUID.randomUUID();
        jdbc.sql("""
                INSERT INTO events (id, user_id, title, start_date, end_date, event_type)
                VALUES (?, ?, '여행', DATE '2026-12-01', DATE '2026-12-03', 'travel')""")
                .params(eventId, userId).update();
        jdbc.sql("""
                INSERT INTO transactions (id, user_id, spent_on, amount, category, merchant, event_id)
                VALUES (?, ?, DATE '2026-12-01', 120000, 'lodging', '강릉 숙소', ?)""")
                .params(UUID.randomUUID(), userId, eventId).update();

        assertThat(mvc.delete().uri("/api/v1/me").header(HttpHeaders.AUTHORIZATION, user.bearer()))
                .hasStatus(HttpStatus.NO_CONTENT);

        for (String table : new String[] {"users", "refresh_tokens", "events", "transactions"}) {
            String column = table.equals("users") ? "id" : "user_id";
            assertThat(jdbc.sql("SELECT count(*) FROM " + table + " WHERE " + column + " = ?").param(userId)
                    .query(Long.class).single()).as(table).isZero();
        }
        assertThat(mvc.get().uri("/api/v1/me").header(HttpHeaders.AUTHORIZATION, user.bearer()))
                .hasStatus(HttpStatus.NOT_FOUND);
        assertThat(mvc.post().uri("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"email": "%s", "password": "%s"}""".formatted(user.email(), TestAccounts.PASSWORD)))
                .hasStatus(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void needsLogin() {
        assertThat(mvc.get().uri("/api/v1/me")).hasStatus(HttpStatus.UNAUTHORIZED);
    }

    private MvcTestResult patch(SignedUp user, String json) {
        return mvc.patch().uri("/api/v1/me").header(HttpHeaders.AUTHORIZATION, user.bearer())
                .contentType(MediaType.APPLICATION_JSON).content(json).exchange();
    }

    private UUID userIdOf(SignedUp user) {
        return jdbc.sql("SELECT id FROM users WHERE email = ?").param(user.email().toLowerCase(Locale.ROOT))
                .query(UUID.class).single();
    }
}
