package com.planny.server.shared;

import java.security.SecureRandom;
import java.util.UUID;

/**
 * UUID 버전 7 (RFC 9562). 앞 48비트가 밀리초 시각이라 만든 순서대로 정렬되고, 나머지는 난수다.
 * 앱에서 만들기 때문에 DB에 저장하기 전에도 id를 알 수 있다.
 */
public final class UuidV7 {

    private static final SecureRandom RANDOM = new SecureRandom();

    private UuidV7() {
    }

    public static UUID generate() {
        return generate(System.currentTimeMillis());
    }

    static UUID generate(long epochMillis) {
        // 시각 48비트 | 버전 4비트(0111) | 난수 12비트
        long mostSigBits = (epochMillis << 16) | 0x7000L | (RANDOM.nextLong() & 0x0FFFL);
        // 변형 2비트(10) | 난수 62비트
        long leastSigBits = (RANDOM.nextLong() & 0x3FFF_FFFF_FFFF_FFFFL) | 0x8000_0000_0000_0000L;
        return new UUID(mostSigBits, leastSigBits);
    }
}
