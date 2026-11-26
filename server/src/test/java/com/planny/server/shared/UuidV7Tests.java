package com.planny.server.shared;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;
import org.junit.jupiter.api.Test;

class UuidV7Tests {

    @Test
    void hasVersion7AndRfcVariant() {
        UUID uuid = UuidV7.generate();

        assertThat(uuid.version()).isEqualTo(7);
        assertThat(uuid.variant()).isEqualTo(2);
    }

    @Test
    void sortsByCreationTime() {
        long now = System.currentTimeMillis();

        UUID earlier = UuidV7.generate(now);
        UUID later = UuidV7.generate(now + 1);

        assertThat(earlier).isLessThan(later);
        assertThat(earlier.toString()).isLessThan(later.toString());
        assertThat(earlier.getMostSignificantBits() >>> 16).isEqualTo(now);
    }
}
