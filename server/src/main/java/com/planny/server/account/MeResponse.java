package com.planny.server.account;

/**
 * @param budget 한 달 생활비 예산 (원)
 */
record MeResponse(String email, String userName, long budget) {

    static MeResponse of(User user) {
        return new MeResponse(user.getEmail(), user.getUserName(), user.getBudget());
    }
}
