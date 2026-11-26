package com.planny.server.shared;

import static org.assertj.core.api.Assertions.assertThat;

import com.planny.server.TestcontainersConfiguration;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
class HealthTests {

    @Autowired
    MockMvcTester mvc;

    @Test
    void healthChecksArePublic() {
        for (String path : new String[] {"/actuator/health", "/actuator/health/liveness", "/actuator/health/readiness"}) {
            assertThat(mvc.get().uri(path)).as(path)
                    .hasStatusOk()
                    .bodyJson().extractingPath("$.status").isEqualTo("UP");
        }
    }

    @Test
    void healthDoesNotExposeDetails() {
        assertThat(mvc.get().uri("/actuator/health")).bodyJson().doesNotHavePath("$.components");
    }

    @Test
    void otherActuatorEndpointsAreNotOpen() {
        assertThat(mvc.get().uri("/actuator/env")).hasStatus(HttpStatus.UNAUTHORIZED);
        assertThat(mvc.get().uri("/actuator/beans")).hasStatus(HttpStatus.UNAUTHORIZED);
    }
}
