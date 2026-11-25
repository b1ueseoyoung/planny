package com.planny.server.shared;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ApiVersionConfigurer;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Spring Framework 7 API 버전 관리. 컨트롤러는 {@code /api/{version}/...}로 매핑하고,
 * 지원하지 않는 버전(/api/v2/...)으로 오면 400으로 답한다.
 */
@Configuration(proxyBeanMethods = false)
class ApiVersioningConfig implements WebMvcConfigurer {

    @Override
    public void configureApiVersioning(ApiVersionConfigurer configurer) {
        configurer
                // /api/v1/transactions 에서 /api 다음 조각(v1)이 버전이다
                .usePathSegment(1, path -> path.pathWithinApplication().value().startsWith("/api/"))
                // /.well-known/jwks.json, /actuator/health 처럼 버전이 없는 경로도 받는다
                .setVersionRequired(false)
                .addSupportedVersions("1");
    }
}
