package com.planny.server.account;

import com.planny.server.shared.CurrentUser;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/{version}/me")
class MeController {

    private final MeService meService;

    MeController(MeService meService) {
        this.meService = meService;
    }

    @GetMapping
    MeResponse get(@CurrentUser UUID userId) {
        return meService.get(userId);
    }

    /** 이름이나 한 달 예산을 바꾼다. 보낸 필드만 바뀐다. */
    @PatchMapping
    MeResponse update(@CurrentUser UUID userId, @Valid @RequestBody UpdateMeRequest request) {
        return meService.update(userId, request);
    }

    /** 탈퇴하고 내 데이터(토큰, 일정, 거래)를 모두 지운다. 되돌릴 수 없다. */
    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@CurrentUser UUID userId) {
        meService.delete(userId);
    }
}
