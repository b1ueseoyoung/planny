package com.planny.server.account;

import com.planny.server.shared.ApiException;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 계정 모듈의 공개 API: 이름과 한 달 예산 */
@Service
public class ProfileService {

    private final UserRepository users;

    ProfileService(UserRepository users) {
        this.users = users;
    }

    @Transactional(readOnly = true)
    public Profile get(UUID userId) {
        User user = find(userId);
        return new Profile(user.getUserName(), user.getBudget());
    }

    @Transactional
    public Profile replace(UUID userId, Profile profile) {
        User user = find(userId);
        user.changeUserName(profile.userName());
        user.changeBudget(profile.budget());
        return new Profile(user.getUserName(), user.getBudget());
    }

    private User find(UUID userId) {
        return users.findById(userId).orElseThrow(() -> ApiException.notFound("사용자를 찾을 수 없습니다."));
    }
}
