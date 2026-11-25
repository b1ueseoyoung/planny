package com.planny.server.account;

import com.planny.server.shared.BaseEntity;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.time.Instant;
import org.hibernate.annotations.CreationTimestamp;
import org.jspecify.annotations.Nullable;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "users")
class User extends BaseEntity {

    static final String DEFAULT_USER_NAME = "나";

    /** 프론트 목업 데이터와 같은 기본 예산 */
    static final long DEFAULT_BUDGET = 1_200_000;

    /** 소문자로 바꿔 저장한다 */
    private String email;

    /** Argon2id 해시 */
    private String passwordHash;

    private String userName;

    /** 한 달 생활비 예산 (원) */
    private long budget;

    // DB 기록용 시각. Hibernate가 저장할 때 채운다
    @CreationTimestamp
    @SuppressWarnings("UnusedVariable")
    private @Nullable Instant createdAt;

    @UpdateTimestamp
    @SuppressWarnings("UnusedVariable")
    private @Nullable Instant updatedAt;

    protected User() {
    }

    User(String email, String passwordHash, String userName, long budget) {
        this.email = email;
        this.passwordHash = passwordHash;
        this.userName = userName;
        this.budget = budget;
    }

    String getEmail() {
        return email;
    }

    String getPasswordHash() {
        return passwordHash;
    }

    String getUserName() {
        return userName;
    }

    long getBudget() {
        return budget;
    }

    void changeUserName(@Nullable String userName) {
        this.userName = userNameOrDefault(userName);
    }

    void changeBudget(long budget) {
        this.budget = budget;
    }

    /** 프론트 설정 화면과 같이 앞뒤 공백을 지우고, 비어 있으면 "나"로 한다. */
    static String userNameOrDefault(@Nullable String userName) {
        return (userName == null || userName.isBlank()) ? DEFAULT_USER_NAME : userName.strip();
    }
}
