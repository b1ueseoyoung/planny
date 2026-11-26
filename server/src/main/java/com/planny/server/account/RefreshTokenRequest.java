package com.planny.server.account;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

record RefreshTokenRequest(@NotBlank @Size(max = 100) String refreshToken) {
}
