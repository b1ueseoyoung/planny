package com.planny.server.account;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * @param email 로그인 실패 횟수를 이메일별로 메모리에 세므로, 아주 긴 값으로 메모리를 채우지 못하게 길이를 제한한다
 */
record LoginRequest(@NotBlank @Size(max = 254) String email, @NotBlank @Size(max = 128) String password) {
}
