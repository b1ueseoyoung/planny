package com.planny.server.shared;

import static org.assertj.core.api.Assertions.assertThat;

import com.planny.server.TestcontainersConfiguration;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@Import({TestcontainersConfiguration.class, ProblemDetailsTests.SampleController.class})
@SpringBootTest
@AutoConfigureMockMvc
class ProblemDetailsTests {

    @Autowired
    MockMvcTester mvc;

    @Test
    void apiExceptionBecomesProblemDetail() {
        assertThat(mvc.get().uri("/api/v1/samples/missing"))
                .hasStatus(HttpStatus.NOT_FOUND)
                .hasContentType(MediaType.APPLICATION_PROBLEM_JSON)
                .bodyJson()
                .isLenientlyEqualTo("""
                        {"status": 404, "code": "NOT_FOUND", "detail": "샘플을 찾을 수 없습니다",
                         "instance": "/api/v1/samples/missing"}""");
    }

    @Test
    void invalidBodyListsEveryWrongField() {
        assertThat(mvc.post().uri("/api/v1/samples")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"title": " ", "amount": 0}"""))
                .hasStatus(HttpStatus.BAD_REQUEST)
                .bodyJson()
                .satisfies(json -> {
                    assertThat(json).extractingPath("$.code").isEqualTo("VALIDATION_FAILED");
                    assertThat(json).extractingPath("$.errors[*].field").asArray()
                            .containsExactlyInAnyOrder("title", "amount");
                    assertThat(json).extractingPath("$.errors[?(@.field == 'title')].message").asArray()
                            .containsExactly("공백일 수 없습니다");
                });
    }

    @Test
    void unreadableValueReportsWhere() {
        assertThat(mvc.post().uri("/api/v1/samples")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"title": "점심", "amount": "만원"}"""))
                .hasStatus(HttpStatus.BAD_REQUEST)
                .bodyJson()
                .isLenientlyEqualTo("""
                        {"code": "MALFORMED_REQUEST", "errors": [{"field": "amount"}]}""");
    }

    @Test
    void unexpectedErrorHidesInternals() {
        assertThat(mvc.get().uri("/api/v1/samples/boom"))
                .hasStatus(HttpStatus.INTERNAL_SERVER_ERROR)
                .bodyText()
                .contains("INTERNAL_ERROR")
                .doesNotContain("DB 비밀번호");
    }

    @Test
    void frameworkErrorsAlsoHaveCode() {
        assertThat(mvc.delete().uri("/api/v1/samples/missing"))
                .hasStatus(HttpStatus.METHOD_NOT_ALLOWED)
                .bodyJson()
                .extractingPath("$.code").isEqualTo("METHOD_NOT_ALLOWED");
        assertThat(mvc.get().uri("/api/v1/nothing-here"))
                .hasStatus(HttpStatus.NOT_FOUND)
                .bodyJson()
                .extractingPath("$.code").isEqualTo("NOT_FOUND");
    }

    @Test
    void rejectsUnsupportedApiVersion() {
        assertThat(mvc.get().uri("/api/v2/samples/missing"))
                .hasStatus(HttpStatus.BAD_REQUEST)
                .hasContentType(MediaType.APPLICATION_PROBLEM_JSON);
        assertThat(mvc.get().uri("/api/latest/samples/missing"))
                .hasStatus(HttpStatus.BAD_REQUEST);
    }

    @Test
    void pathsOutsideApiNeedNoVersion() {
        assertThat(mvc.get().uri("/unversioned-sample")).hasStatusOk().bodyText().isEqualTo("ok");
    }

    @RestController
    static class SampleController {

        record Sample(@NotBlank String title, @Positive long amount) {
        }

        @GetMapping("/api/{version}/samples/missing")
        void missing() {
            throw ApiException.notFound("샘플을 찾을 수 없습니다");
        }

        @PostMapping("/api/{version}/samples")
        void create(@Valid @RequestBody Sample sample) {
        }

        @GetMapping("/api/{version}/samples/boom")
        void boom() {
            throw new IllegalStateException("DB 비밀번호가 틀렸습니다");
        }

        @GetMapping("/unversioned-sample")
        String unversioned() {
            return "ok";
        }
    }
}
