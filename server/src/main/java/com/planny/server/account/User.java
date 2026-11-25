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
}
