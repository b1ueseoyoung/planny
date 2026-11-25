package com.planny.server.account;

/**
 * @param accessToken API를 부를 때 Authorization: Bearer 헤더에 넣는 JWT
 * @param expiresIn 액세스 토큰이 몇 초 뒤에 만료되는지
 * @param refreshToken 액세스 토큰이 만료되면 /auth/refresh로 새 토큰을 받을 때 쓴다. 한 번 쓰면 바뀐다
 * @param refreshTokenExpiresIn 리프레시 토큰이 몇 초 뒤에 만료되는지
 */
record TokenResponse(
        String accessToken,
        String tokenType,
        long expiresIn,
        String refreshToken,
        long refreshTokenExpiresIn) {
}
