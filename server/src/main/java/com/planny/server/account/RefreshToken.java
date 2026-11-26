package com.planny.server.account;

import com.planny.server.shared.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.CreationTimestamp;
import org.jspecify.annotations.Nullable;

@Entity
@Table(name = "refresh_tokens")
class RefreshToken extends BaseEntity {

    @Column(updatable = false)
    private UUID userId;

    /** 같은 로그인에서 이어진 토큰은 familyId가 같다 */
    @Column(updatable = false)
    private UUID familyId;

    /** 토큰 원문의 SHA-256. 원문은 저장하지 않는다 */
    @Column(updatable = false)
    private byte[] tokenHash;

    @CreationTimestamp
    @SuppressWarnings("UnusedVariable")
    private @Nullable Instant createdAt;

    private Instant expiresAt;

    /** 새 토큰으로 바꾼 시각. 이 토큰이 다시 오면 탈취로 본다 */
    private @Nullable Instant usedAt;

    private @Nullable Instant revokedAt;

    protected RefreshToken() {
    }

    RefreshToken(UUID userId, UUID familyId, byte[] tokenHash, Instant expiresAt) {
        this.userId = userId;
        this.familyId = familyId;
        this.tokenHash = tokenHash.clone();
        this.expiresAt = expiresAt;
    }

    UUID getUserId() {
        return userId;
    }

    UUID getFamilyId() {
        return familyId;
    }

    boolean isUsed() {
        return usedAt != null;
    }

    boolean isRevoked() {
        return revokedAt != null;
    }

    boolean isUsableAt(Instant now) {
        return !isUsed() && !isRevoked() && now.isBefore(expiresAt);
    }

    void markUsed(Instant now) {
        this.usedAt = now;
    }
}
