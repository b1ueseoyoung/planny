package com.planny.server.shared;

import static org.assertj.core.api.Assertions.assertThat;

import com.planny.server.TestcontainersConfiguration;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
class ApiDocsTests {

    @Autowired
    MockMvcTester mvc;

    @Test
    void documentsApiWithRealPathsAndBearerToken() throws Exception {
        var result = mvc.get().uri("/v3/api-docs").exchange();
        // 프론트에서 타입을 만들 때 쓸 수 있게 build/에 남긴다
        Files.writeString(Path.of("build/openapi.json"),
                new String(result.getResponse().getContentAsByteArray(), StandardCharsets.UTF_8));

        assertThat(result).hasStatusOk().bodyText().doesNotContain("{version}");
        assertThat(result).bodyJson().satisfies(json -> {
            assertThat(json).extractingPath("$.info.title").isEqualTo("Planny API");
            assertThat(json).hasPath("$.paths['/api/v1/events'].get");
            assertThat(json).hasPath("$.components.securitySchemes.bearer");
            // 로그인 같은 공개 API에는 토큰 표시가 없다
            assertThat(json).extractingPath("$.paths['/api/v1/auth/login'].post.security").asArray().isEmpty();
        });
    }

    @Test
    void swaggerUiIsPublic() {
        assertThat(mvc.get().uri("/swagger-ui.html")).hasStatus3xxRedirection();
        assertThat(mvc.get().uri("/swagger-ui/index.html")).hasStatusOk();
    }
}
