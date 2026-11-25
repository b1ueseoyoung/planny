package com.planny.server.schedule;

import static org.assertj.core.api.Assertions.assertThat;

import com.jayway.jsonpath.JsonPath;
import com.planny.server.TestAccounts;
import com.planny.server.TestAccounts.SignedUp;
import com.planny.server.TestcontainersConfiguration;
import java.nio.charset.StandardCharsets;
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
class EventTests {

    static final String SEONGSU_MEETUP = """
            {
              "title": "성수동 친구 모임",
              "startDate": "2026-12-05",
              "endDate": "2026-12-05",
              "eventType": "friends",
              "location": "성수동",
              "people": ["민지", "서준"],
              "prediction": {
                "title": "성수동 친구 모임",
                "startDate": "2026-12-05",
                "endDate": "2026-12-05",
                "eventType": "friends",
                "location": "성수동",
                "people": ["민지", "서준"],
                "items": [
                  {"category": "meal", "label": "저녁 식사", "amount": 32000},
                  {"category": "cafe", "label": "카페", "amount": 7000}
                ],
                "reasons": ["지난 성수동 모임 3번 평균 47,000원"],
                "savingTips": [{"label": "2차 카페 대신 산책", "amount": 7000}]
              },
              "source": "ai"
            }""";

    @Autowired
    MockMvcTester mvc;

    @Autowired
    JdbcClient jdbc;

    @Test
    void createsEventWithPredictionInTypesTsShape() {
        var user = TestAccounts.signUp(mvc);

        var created = post(user, SEONGSU_MEETUP);

        assertThat(created).hasStatus(HttpStatus.CREATED)
                .bodyJson().isLenientlyEqualTo(SEONGSU_MEETUP);
        String id = idOf(created);
        assertThat(UUID.fromString(id).version()).isEqualTo(7);
        assertThat(created.getResponse().getHeader(HttpHeaders.LOCATION)).endsWith("/api/v1/events/" + id);
        assertThat(get(user, "/api/v1/events/" + id)).hasStatusOk().bodyJson().isLenientlyEqualTo(SEONGSU_MEETUP);
    }

    @Test
    void storesPredictionAsJsonbWithLowercaseCodes() {
        var user = TestAccounts.signUp(mvc);
        String id = idOf(post(user, SEONGSU_MEETUP));

        String category = jdbc.sql("SELECT prediction -> 'items' -> 0 ->> 'category' FROM events WHERE id = ?::uuid")
                .param(id).query(String.class).single();
        assertThat(category).isEqualTo("meal");
    }

    @Test
    void optionalFieldsHaveTypesTsDefaults() {
        var user = TestAccounts.signUp(mvc);

        assertThat(post(user, """
                {"title": "회식", "startDate": "2026-12-10", "endDate": "2026-12-10", "eventType": "work"}"""))
                .hasStatus(HttpStatus.CREATED)
                .bodyJson().isLenientlyEqualTo("""
                        {"location": null, "people": [], "prediction": null, "source": null}""");
    }

    @Test
    void listsEventsOverlappingTheRange() {
        var user = TestAccounts.signUp(mvc);
        post(user, event("강릉 여행", "2026-12-01", "2026-12-03", "travel"));
        post(user, event("성수동 모임", "2026-12-05", "2026-12-05", "friends"));
        post(user, event("연말 회식", "2026-12-20", "2026-12-20", "work"));

        assertThat(get(user, "/api/v1/events?from=2026-12-03&to=2026-12-05"))
                .hasStatusOk().bodyJson().extractingPath("$[*].title").asArray()
                .containsExactly("강릉 여행", "성수동 모임");
        assertThat(get(user, "/api/v1/events"))
                .bodyJson().extractingPath("$[*].title").asArray()
                .containsExactly("강릉 여행", "성수동 모임", "연말 회식");
        assertThat(get(user, "/api/v1/events?from=2026-12-06&to=2026-12-01"))
                .hasStatus(HttpStatus.BAD_REQUEST);
    }

    @Test
    void updatesWholeEvent() {
        var user = TestAccounts.signUp(mvc);
        String id = idOf(post(user, SEONGSU_MEETUP));

        assertThat(put(user, id, event("성수동 모임 (날짜 변경)", "2026-12-06", "2026-12-06", "friends")))
                .hasStatusOk()
                .bodyJson().isLenientlyEqualTo("""
                        {"title": "성수동 모임 (날짜 변경)", "startDate": "2026-12-06", "people": [], "prediction": null}""");
    }

    @Test
    void otherUsersEventsLookMissing() {
        var owner = TestAccounts.signUp(mvc);
        var stranger = TestAccounts.signUp(mvc);
        String id = idOf(post(owner, SEONGSU_MEETUP));

        assertThat(get(stranger, "/api/v1/events/" + id)).hasStatus(HttpStatus.NOT_FOUND);
        assertThat(put(stranger, id, SEONGSU_MEETUP)).hasStatus(HttpStatus.NOT_FOUND);
        assertThat(delete(stranger, id)).hasStatus(HttpStatus.NOT_FOUND);
        assertThat(get(stranger, "/api/v1/events")).bodyJson().isEqualTo("[]");
        assertThat(get(owner, "/api/v1/events/" + id)).hasStatusOk();
    }

    @Test
    void deletesEvent() {
        var user = TestAccounts.signUp(mvc);
        String id = idOf(post(user, SEONGSU_MEETUP));

        assertThat(delete(user, id)).hasStatus(HttpStatus.NO_CONTENT);
        assertThat(get(user, "/api/v1/events/" + id)).hasStatus(HttpStatus.NOT_FOUND);
    }

    @Test
    void rejectsInvalidEvents() {
        var user = TestAccounts.signUp(mvc);

        assertThat(post(user, event("여행", "2026-12-03", "2026-12-01", "travel")))
                .hasStatus(HttpStatus.BAD_REQUEST)
                .bodyJson().extractingPath("$.errors[0].field").isEqualTo("endDate");
        assertThat(post(user, event("파티", "2026-12-03", "2026-12-03", "party")))
                .hasStatus(HttpStatus.BAD_REQUEST)
                .bodyJson().extractingPath("$.errors[0].field").isEqualTo("eventType");
        assertThat(post(user, SEONGSU_MEETUP.replace("\"category\": \"meal\"", "\"category\": \"coffee\"")))
                .hasStatus(HttpStatus.BAD_REQUEST)
                .bodyJson().extractingPath("$.errors[0].field").isEqualTo("prediction.items[0].category");
        assertThat(post(user, SEONGSU_MEETUP.replace("\"amount\": 32000", "\"amount\": -1")))
                .hasStatus(HttpStatus.BAD_REQUEST)
                .bodyJson().extractingPath("$.errors[0].field").isEqualTo("prediction.items[0].amount");
    }

    static String event(String title, String startDate, String endDate, String eventType) {
        return """
                {"title": "%s", "startDate": "%s", "endDate": "%s", "eventType": "%s"}"""
                .formatted(title, startDate, endDate, eventType);
    }

    private MvcTestResult post(SignedUp user, String json) {
        return mvc.post().uri("/api/v1/events").header(HttpHeaders.AUTHORIZATION, user.bearer())
                .contentType(MediaType.APPLICATION_JSON).content(json).exchange();
    }

    private MvcTestResult put(SignedUp user, String id, String json) {
        return mvc.put().uri("/api/v1/events/" + id).header(HttpHeaders.AUTHORIZATION, user.bearer())
                .contentType(MediaType.APPLICATION_JSON).content(json).exchange();
    }

    private MvcTestResult get(SignedUp user, String uri) {
        return mvc.get().uri(uri).header(HttpHeaders.AUTHORIZATION, user.bearer()).exchange();
    }

    private MvcTestResult delete(SignedUp user, String id) {
        return mvc.delete().uri("/api/v1/events/" + id).header(HttpHeaders.AUTHORIZATION, user.bearer()).exchange();
    }

    static String idOf(MvcTestResult result) {
        return JsonPath.read(new String(result.getResponse().getContentAsByteArray(), StandardCharsets.UTF_8), "$.id");
    }
}
