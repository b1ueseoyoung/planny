package com.planny.server.account;

import com.planny.server.shared.ApiException;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class MeService {

    private final UserRepository users;

    MeService(UserRepository users) {
        this.users = users;
    }

    @Transactional(readOnly = true)
    MeResponse get(UUID userId) {
        return MeResponse.of(find(userId));
    }

    @Transactional
    MeResponse update(UUID userId, UpdateMeRequest request) {
        User user = find(userId);
        if (request.userName() != null) {
            user.changeUserName(request.userName());
        }
        Long budget = request.budget();
        if (budget != null) {
            user.changeBudget(budget);
        }
        return MeResponse.of(user);
    }

    /** 탈퇴. 토큰, 일정, 거래는 DB가 함께 지운다(ON DELETE CASCADE). */
    @Transactional
    void delete(UUID userId) {
        users.deleteById(userId);
    }

    private User find(UUID userId) {
        return users.findById(userId).orElseThrow(() -> ApiException.notFound("사용자를 찾을 수 없습니다."));
    }
}
