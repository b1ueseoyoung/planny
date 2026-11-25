package com.planny.server.account;

import java.util.UUID;

/** 방금 만든 리프레시 토큰. value는 응답으로 한 번만 내보내고 저장하지 않는다. */
record IssuedRefreshToken(UUID userId, String value) {
}
