package com.planny.server.backup;

import static org.assertj.core.api.Assertions.assertThat;

import com.jayway.jsonpath.JsonPath;
import com.planny.server.TestAccounts;
import com.planny.server.TestAccounts.SignedUp;
import com.planny.server.TestcontainersConfiguration;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;
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
class BackupTests {

    /** 프론트 localStorage에 저장된 모양 그대로 (mock-data.ts와 store.tsx의 id 형식) */
    static final String DEVICE_DATA = """
            {
              "userName": "서영",
              "budget": 1500000,
              "transactions": [
                {"id": "tx_0001", "date": "2026-11-30", "amount": 13500, "category": "subscription", "merchant": "넷플릭스"},
                {"id": "tx_0002", "date": "2026-12-05", "amount": 32000, "category": "meal", "merchant": "성수 파스타", "eventId": "evt_1a2b3c4d"},
                {"id": "tx_0003", "date": "2026-12-06", "amount": 4500, "category": "cafe", "merchant": "메가커피", "eventId": "evt_deleted"}
              ],
              "events": [
                {
                  "id": "evt_1a2b3c4d", "title": "성수동 친구 모임", "startDate": "2026-12-05", "endDate": "2026-12-05",
                  "eventType": "friends", "location": "성수동", "people": ["민지"],
                  "prediction": {
                    "title": "성수동 친구 모임", "startDate": "2026-12-05", "endDate": "2026-12-05", "eventType": "friends",
                    "location": "성수동", "items": [{"category": "meal", "label": "저녁 식사", "amount": 32000}],
                    "reasons": ["지난 성수동 모임 평균 47,000원"], "savingTips": []
                  },
                  "source": "mock"
                },
                {
                  "id": "evt_9f8e7d6c", "title": "강릉 여행", "startDate": "2026-12-19", "endDate": "2026-12-21",
                  "eventType": "travel", "location": null, "prediction": null, "source": null
                }
              ]
            }""";

    @Autowired
    MockMvcTester mvc;

    @Test
    void replacesWithDeviceDataAndKeepsEventLinks() {
        var user = TestAccounts.signUp(mvc);

        var result = put(user, DEVICE_DATA);

        assertThat(result).hasStatusOk().bodyJson().isLenientlyEqualTo("""
                {"userName": "서영", "budget": 1500000,
                 "transactions": [{"merchant": "넷플릭스"}, {"merchant": "성수 파스타"}, {"merchant": "메가커피"}],
                 "events": [{"title": "성수동 친구 모임", "people": ["민지"], "source": "mock"},
                            {"title": "강릉 여행", "people": []}]}""");
        String body = bodyOf(result);
        String meetupId = JsonPath.read(body, "$.events[0].id");
        assertThat(UUID.fromString(meetupId).version()).isEqualTo(7);
        // 기기 id(evt_1a2b3c4d)를 가리키던 거래는 새 일정 id를 가리킨다
        assertThat(JsonPath.<String>read(body, "$.transactions[1].eventId")).isEqualTo(meetupId);
        // 요청 안에 없는 일정을 가리키던 거래는 연결이 끊긴다
        assertThat(JsonPath.<Map<String, Object>>read(body, "$.transactions[2]")).doesNotContainKey("eventId");
        assertThat(get(user)).hasStatusOk().bodyJson().isStrictlyEqualTo(body);
    }

    @Test
    void replacesExistingDataCompletely() {
        var user = TestAccounts.signUp(mvc);
        put(user, DEVICE_DATA);

        assertThat(put(user, """
                {"userName": "", "budget": 0, "transactions": [], "events": []}"""))
                .hasStatusOk().bodyJson().isStrictlyEqualTo("""
                        {"userName": "나", "budget": 0, "transactions": [], "events": []}""");
    }

    @Test
    void sendingTheSameDataTwiceGivesTheSameResult() {
        var user = TestAccounts.signUp(mvc);

        String first = withoutIds(bodyOf(put(user, DEVICE_DATA)));
        String second = withoutIds(bodyOf(put(user, DEVICE_DATA)));

        assertThat(second).isEqualTo(first);
    }

    @Test
    void doesNotTouchOtherUsersData() {
        var me = TestAccounts.signUp(mvc);
        var other = TestAccounts.signUp(mvc);
        put(other, DEVICE_DATA);

        put(me, """
                {"userName": "나", "budget": 0, "transactions": [], "events": []}""");

        assertThat(get(other)).bodyJson().extractingPath("$.transactions").asArray().hasSize(3);
    }

    @Test
    void reportsWhichItemIsWrong() {
        var user = TestAccounts.signUp(mvc);

        assertThat(put(user, DEVICE_DATA.replace("\"2026-12-21\"", "\"2026-12-18\"")))
                .hasStatus(HttpStatus.BAD_REQUEST)
                .bodyJson().extractingPath("$.errors[0].field").isEqualTo("events[1].endDate");
        assertThat(put(user, DEVICE_DATA.replace("\"evt_9f8e7d6c\"", "\"evt_1a2b3c4d\"")))
                .hasStatus(HttpStatus.BAD_REQUEST)
                .bodyJson().extractingPath("$.errors[0].field").isEqualTo("events[1].id");
        assertThat(put(user, DEVICE_DATA.replace("\"amount\": 4500", "\"amount\": 0")))
                .hasStatus(HttpStatus.BAD_REQUEST)
                .bodyJson().extractingPath("$.errors[0].field").isEqualTo("transactions[2].amount");
    }

    @Test
    void failedReplaceChangesNothing() {
        var user = TestAccounts.signUp(mvc);
        String before = bodyOf(put(user, DEVICE_DATA));

        put(user, DEVICE_DATA.replace("\"amount\": 4500", "\"amount\": 0"));

        assertThat(get(user)).bodyJson().isStrictlyEqualTo(before);
    }

    private MvcTestResult put(SignedUp user, String json) {
        return mvc.put().uri("/api/v1/app-data").header(HttpHeaders.AUTHORIZATION, user.bearer())
                .contentType(MediaType.APPLICATION_JSON).content(json).exchange();
    }

    private MvcTestResult get(SignedUp user) {
        return mvc.get().uri("/api/v1/app-data").header(HttpHeaders.AUTHORIZATION, user.bearer()).exchange();
    }

    private static String bodyOf(MvcTestResult result) {
        return new String(result.getResponse().getContentAsByteArray(), StandardCharsets.UTF_8);
    }

    /** 서버가 새로 만든 id만 빼고 비교한다 */
    private static String withoutIds(String json) {
        Map<String, Object> data = JsonPath.read(json, "$");
        String text = data.toString();
        return text.replaceAll("[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}", "<id>");
    }
}
