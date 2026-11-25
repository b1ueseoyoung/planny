package com.planny.server.ledger;

import static org.assertj.core.api.Assertions.assertThat;

import com.jayway.jsonpath.JsonPath;
import com.planny.server.TestAccounts;
import com.planny.server.TestAccounts.SignedUp;
import com.planny.server.TestcontainersConfiguration;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import org.jspecify.annotations.Nullable;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
class TransactionTests {

    @Autowired
    MockMvcTester mvc;

    @Test
    void createsTransactionInTypesTsShape() {
        var user = TestAccounts.signUp(mvc);
        String lunch = transaction("2026-12-01", 9500, "meal", "국밥집", null);

        var created = post(user, "/api/v1/transactions", lunch);

        assertThat(created).hasStatus(HttpStatus.CREATED).bodyJson().isLenientlyEqualTo(lunch);
        // types.ts의 eventId?: string 처럼, 연결이 없으면 필드가 아예 없다
        assertThat(created).bodyJson().doesNotHavePath("$.eventId");
        String id = idOf(created);
        assertThat(created.getResponse().getHeader(HttpHeaders.LOCATION)).endsWith("/api/v1/transactions/" + id);
    }

    @Test
    void linksToMyEvent() {
        var user = TestAccounts.signUp(mvc);
        String eventId = createEvent(user);

        assertThat(post(user, "/api/v1/transactions", transaction("2026-12-05", 32000, "meal", "성수 파스타", eventId)))
                .hasStatus(HttpStatus.CREATED)
                .bodyJson().extractingPath("$.eventId").isEqualTo(eventId);
    }

    @Test
    void cannotLinkToOtherUsersOrMissingEvent() {
        var user = TestAccounts.signUp(mvc);
        String othersEvent = createEvent(TestAccounts.signUp(mvc));

        for (String eventId : new String[] {othersEvent, UUID.randomUUID().toString()}) {
            assertThat(post(user, "/api/v1/transactions", transaction("2026-12-05", 32000, "meal", "성수 파스타", eventId)))
                    .hasStatus(HttpStatus.BAD_REQUEST)
                    .bodyJson().extractingPath("$.errors[0].field").isEqualTo("eventId");
        }
    }

    @Test
    void deletingEventKeepsTransactionButUnlinksIt() {
        var user = TestAccounts.signUp(mvc);
        String eventId = createEvent(user);
        String id = idOf(post(user, "/api/v1/transactions", transaction("2026-12-05", 32000, "meal", "성수 파스타", eventId)));

        assertThat(mvc.delete().uri("/api/v1/events/" + eventId).header(HttpHeaders.AUTHORIZATION, user.bearer()))
                .hasStatus(HttpStatus.NO_CONTENT);

        assertThat(get(user, "/api/v1/transactions/" + id)).hasStatusOk()
                .bodyJson().doesNotHavePath("$.eventId");
    }

    @Test
    void listsTransactionsInRangeByDate() {
        var user = TestAccounts.signUp(mvc);
        post(user, "/api/v1/transactions", transaction("2026-12-02", 4500, "cafe", "메가커피", null));
        post(user, "/api/v1/transactions", transaction("2026-11-30", 13500, "subscription", "넷플릭스", null));
        post(user, "/api/v1/transactions", transaction("2026-12-01", 9500, "meal", "국밥집", null));

        assertThat(get(user, "/api/v1/transactions?from=2026-12-01&to=2026-12-31"))
                .bodyJson().extractingPath("$[*].merchant").asArray().containsExactly("국밥집", "메가커피");
        assertThat(get(user, "/api/v1/transactions"))
                .bodyJson().extractingPath("$[*].merchant").asArray().containsExactly("넷플릭스", "국밥집", "메가커피");
    }

    @Test
    void updatesAndDeletesOnlyMyTransactions() {
        var owner = TestAccounts.signUp(mvc);
        var stranger = TestAccounts.signUp(mvc);
        String id = idOf(post(owner, "/api/v1/transactions", transaction("2026-12-01", 9500, "meal", "국밥집", null)));
        String changed = transaction("2026-12-01", 11000, "meal", "국밥집 (특)", null);

        assertThat(put(stranger, id, changed)).hasStatus(HttpStatus.NOT_FOUND);
        assertThat(mvc.delete().uri("/api/v1/transactions/" + id).header(HttpHeaders.AUTHORIZATION, stranger.bearer()))
                .hasStatus(HttpStatus.NOT_FOUND);

        assertThat(put(owner, id, changed)).hasStatusOk().bodyJson().isLenientlyEqualTo(changed);
        assertThat(mvc.delete().uri("/api/v1/transactions/" + id).header(HttpHeaders.AUTHORIZATION, owner.bearer()))
                .hasStatus(HttpStatus.NO_CONTENT);
        assertThat(get(owner, "/api/v1/transactions/" + id)).hasStatus(HttpStatus.NOT_FOUND);
    }

    @Test
    void rejectsInvalidTransactions() {
        var user = TestAccounts.signUp(mvc);

        assertThat(post(user, "/api/v1/transactions", transaction("2026-12-01", 0, "meal", "국밥집", null)))
                .hasStatus(HttpStatus.BAD_REQUEST)
                .bodyJson().extractingPath("$.errors[0].field").isEqualTo("amount");
        assertThat(post(user, "/api/v1/transactions", transaction("2026-12-01", 4500, "coffee", "메가커피", null)))
                .hasStatus(HttpStatus.BAD_REQUEST)
                .bodyJson().extractingPath("$.errors[0].field").isEqualTo("category");
        assertThat(post(user, "/api/v1/transactions", transaction("2026-13-01", 4500, "cafe", "메가커피", null)))
                .hasStatus(HttpStatus.BAD_REQUEST)
                .bodyJson().extractingPath("$.errors[0].field").isEqualTo("date");
    }

    private String createEvent(SignedUp user) {
        return idOf(post(user, "/api/v1/events", """
                {"title": "성수동 친구 모임", "startDate": "2026-12-05", "endDate": "2026-12-05", "eventType": "friends"}"""));
    }

    private static String transaction(String date, long amount, String category, String merchant,
            @Nullable String eventId) {
        String link = eventId == null ? "" : ", \"eventId\": \"%s\"".formatted(eventId);
        return """
                {"date": "%s", "amount": %d, "category": "%s", "merchant": "%s"%s}"""
                .formatted(date, amount, category, merchant, link);
    }

    private MvcTestResult post(SignedUp user, String uri, String json) {
        return mvc.post().uri(uri).header(HttpHeaders.AUTHORIZATION, user.bearer())
                .contentType(MediaType.APPLICATION_JSON).content(json).exchange();
    }

    private MvcTestResult put(SignedUp user, String id, String json) {
        return mvc.put().uri("/api/v1/transactions/" + id).header(HttpHeaders.AUTHORIZATION, user.bearer())
                .contentType(MediaType.APPLICATION_JSON).content(json).exchange();
    }

    private MvcTestResult get(SignedUp user, String uri) {
        return mvc.get().uri(uri).header(HttpHeaders.AUTHORIZATION, user.bearer()).exchange();
    }

    private static String idOf(MvcTestResult result) {
        return JsonPath.read(new String(result.getResponse().getContentAsByteArray(), StandardCharsets.UTF_8), "$.id");
    }
}
