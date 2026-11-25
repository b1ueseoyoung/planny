package com.planny.server.ledger;

import com.planny.server.shared.BaseEntity;
import com.planny.server.shared.Category;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.jspecify.annotations.Nullable;

@Entity
@Table(name = "transactions")
class Transaction extends BaseEntity {

    @Column(updatable = false)
    private UUID userId;

    /** 쓴 날 (JSON의 date) */
    private LocalDate spentOn;

    /** 원 단위, 항상 양수 */
    private long amount;

    private Category category;

    private String merchant;

    /** 같은 사용자의 일정만 가리킬 수 있다 (DB 복합 외래 키) */
    private @Nullable UUID eventId;

    // DB 기록용 시각. Hibernate가 저장할 때 채운다
    @CreationTimestamp
    @SuppressWarnings("UnusedVariable")
    private @Nullable Instant createdAt;

    @UpdateTimestamp
    @SuppressWarnings("UnusedVariable")
    private @Nullable Instant updatedAt;

    protected Transaction() {
    }

    Transaction(UUID userId, TransactionRequest request) {
        this.userId = userId;
        assign(request);
    }

    /** 요청 내용으로 모두 바꾼다 (PUT) */
    void apply(TransactionRequest request) {
        assign(request);
    }

    private void assign(TransactionRequest request) {
        this.spentOn = request.date();
        this.amount = request.amount();
        this.category = request.category();
        this.merchant = request.merchant().strip();
        this.eventId = request.eventId();
    }

    LocalDate getSpentOn() {
        return spentOn;
    }

    long getAmount() {
        return amount;
    }

    Category getCategory() {
        return category;
    }

    String getMerchant() {
        return merchant;
    }

    @Nullable UUID getEventId() {
        return eventId;
    }
}
