package com.planny.server.account;

/**
 * @param accessToken API를 부를 때 Authorization: Bearer 헤더에 넣는 JWT
 * @param expiresIn 액세스 토큰이 몇 초 뒤에 만료되는지
 */
record TokenResponse(String accessToken, String tokenType, long expiresIn) {

    static TokenResponse bearer(String accessToken, long expiresIn) {
        return new TokenResponse(accessToken, "Bearer", expiresIn);
    }
}
