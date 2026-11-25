package com.planny.server.shared;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.tags.Tag;
import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * API 문서: /swagger-ui.html (화면), /v3/api-docs (OpenAPI JSON).
 * 컨트롤러와 요청, 응답 record의 Javadoc이 문서 설명으로 들어간다.
 */
@Configuration(proxyBeanMethods = false)
class ApiDocsConfig {

    private static final String BEARER = "bearer";

    @Bean
    OpenAPI plannyOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("Planny API")
                        .version("v1")
                        .description("""
                                AI 기반 미래 소비 예측 캘린더 Planny의 API 서버입니다.
                                JSON 모양은 프론트의 src/lib/types.ts와 같고, 오류는 모두 RFC 9457 Problem Details로 답합니다.
                                가입이나 로그인 응답의 accessToken을 Authorize에 넣으면 나머지 API를 바로 불러 볼 수 있습니다."""))
                .components(new Components().addSecuritySchemes(BEARER, new SecurityScheme()
                        .type(SecurityScheme.Type.HTTP)
                        .scheme("bearer")
                        .bearerFormat("JWT")))
                .addSecurityItem(new SecurityRequirement().addList(BEARER))
                // Swagger UI는 이 순서로 묶음을 보여 준다
                .tags(List.of(
                        new Tag().name("인증").description("가입, 로그인, 토큰 교체, 로그아웃. 토큰 없이 부른다"),
                        new Tag().name("내 정보").description("이름, 한 달 예산, 탈퇴"),
                        new Tag().name("일정").description("일정과 AI 예측 결과 (types.ts의 CalendarEvent)"),
                        new Tag().name("거래").description("실제로 쓴 돈 (types.ts의 Transaction)"),
                        new Tag().name("데이터 전체").description("내 데이터 한 번에 내보내기와 바꾸기 (types.ts의 AppData)"),
                        new Tag().name("공개 키").description("액세스 토큰 검증용 공개 키 (JWKS)")));
    }
}
