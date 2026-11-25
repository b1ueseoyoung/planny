package com.planny.server.backup;

import com.planny.server.shared.CurrentUser;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/{version}/app-data")
class BackupController {

    private final BackupService backupService;

    BackupController(BackupService backupService) {
        this.backupService = backupService;
    }

    /** 내 데이터 전체 (types.ts의 AppData) */
    @GetMapping
    AppDataResponse export(@CurrentUser UUID userId) {
        return backupService.export(userId);
    }

    /**
     * 내 데이터를 통째로 바꾼다. 기기의 localStorage 데이터를 올리거나 샘플 데이터로 초기화할 때 쓴다.
     * 같은 내용을 여러 번 보내도 결과가 같다.
     */
    @PutMapping
    AppDataResponse replace(@CurrentUser UUID userId, @Valid @RequestBody AppDataRequest request) {
        return backupService.replace(userId, request);
    }
}
