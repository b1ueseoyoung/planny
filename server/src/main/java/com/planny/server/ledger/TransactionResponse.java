package com.planny.server.ledger;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.planny.server.shared.Category;
import java.time.LocalDate;
import java.util.UUID;
import org.jspecify.annotations.Nullable;

/**
 * types.ts의 Transaction과 같은 모양.
 *
 * @param eventId 일정에 연결되지 않은 거래는 types.ts처럼 이 필드가 아예 없다
 */
public record TransactionResponse(
        UUID id,
        LocalDate date,
        long amount,
        Category category,
        String merchant,
        @JsonInclude(JsonInclude.Include.NON_NULL) @Nullable UUID eventId) {

    static TransactionResponse of(Transaction transaction) {
        return new TransactionResponse(transaction.getId(), transaction.getSpentOn(), transaction.getAmount(),
                transaction.getCategory(), transaction.getMerchant(), transaction.getEventId());
    }
}
