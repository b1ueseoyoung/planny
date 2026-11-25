package com.planny.server.account;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

record LoginRequest(@NotBlank String email, @NotBlank @Size(max = 128) String password) {
}
