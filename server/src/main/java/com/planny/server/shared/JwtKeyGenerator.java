package com.planny.server.shared;

import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.jwk.Curve;
import com.nimbusds.jose.jwk.ECKey;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.KeyUse;
import com.nimbusds.jose.jwk.gen.ECKeyGenerator;

/** 운영용 JWT 서명 키(ES256, P-256)를 JWKS로 만들어 출력한다: ./gradlew -q generateJwtKey */
public final class JwtKeyGenerator {

    private JwtKeyGenerator() {
    }

    public static void main(String[] args) throws JOSEException {
        // 개인 키가 들어 있으니 비밀 저장소(Secret Manager 등)에만 넣는다
        System.out.println(new JWKSet(newSigningKey()).toString(false));
    }

    static ECKey newSigningKey() throws JOSEException {
        return new ECKeyGenerator(Curve.P_256)
                .keyID(UuidV7.generate().toString())
                .algorithm(JWSAlgorithm.ES256)
                .keyUse(KeyUse.SIGNATURE)
                .generate();
    }
}
