package com.planny.server.shared;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.nimbusds.jose.jwk.Curve;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.gen.ECKeyGenerator;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import java.time.Duration;
import org.jspecify.annotations.Nullable;
import org.junit.jupiter.api.Test;

class JwtConfigTests {

    private final JwtConfig config = new JwtConfig();

    @Test
    void refusesToStartWithoutKeysWhenEphemeralKeyIsNotAllowed() {
        assertThatThrownBy(() -> config.jwtKeys(properties(null, false)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("PLANNY_JWT_KEYS");
    }

    @Test
    void makesTemporaryKeyForLocalDevelopment() throws Exception {
        JWKSet keys = config.jwtKeys(properties(null, true));

        assertThat(keys.getKeys()).singleElement().satisfies(key -> assertThat(key.isPrivate()).isTrue());
    }

    @Test
    void usesConfiguredKeysAndPublishesOnlyPublicParts() throws Exception {
        String configured = new JWKSet(JwtKeyGenerator.newSigningKey()).toString(false);

        JWKSet keys = config.jwtKeys(properties(configured, false));

        assertThat(keys.getKeys().getFirst().getKeyID())
                .isEqualTo(JWKSet.parse(configured).getKeys().getFirst().getKeyID());
        assertThat(keys.toPublicJWKSet().getKeys()).allSatisfy(key -> assertThat(key.isPrivate()).isFalse());
    }

    @Test
    void explainsWhatIsWrongWithConfiguredKeys() throws Exception {
        String publicOnly = new JWKSet(JwtKeyGenerator.newSigningKey()).toString(true);
        String rsa = new JWKSet(new RSAKeyGenerator(2048).keyID("rsa").generate()).toString(false);
        String otherCurve = new JWKSet(new ECKeyGenerator(Curve.P_384).keyID("p384").generate()).toString(false);

        for (String keys : new String[] {"not json", "{\"keys\": []}", publicOnly, rsa, otherCurve}) {
            assertThatThrownBy(() -> config.jwtKeys(properties(keys, false)))
                    .as(keys).isInstanceOf(IllegalStateException.class).hasMessageContaining("PLANNY_JWT_KEYS");
        }
    }

    private static JwtProperties properties(@Nullable String keys, boolean allowEphemeralKey) {
        return new JwtProperties("planny", Duration.ofMinutes(15), keys, allowEphemeralKey);
    }
}
