package com.planny.server.shared;

import com.nimbusds.jose.jwk.JWKSet;
import java.time.Duration;
import java.util.Map;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** 토큰 검증용 공개 키. Next 서버 같은 다른 서비스도 이 키로 액세스 토큰을 검증할 수 있다. */
@RestController
class JwksController {

    private final Map<String, Object> publicKeys;

    JwksController(JWKSet jwtKeys) {
        this.publicKeys = jwtKeys.toPublicJWKSet().toJSONObject();
    }

    @GetMapping("/.well-known/jwks.json")
    ResponseEntity<Map<String, Object>> jwks() {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(Duration.ofMinutes(5)).cachePublic())
                .body(publicKeys);
    }
}
