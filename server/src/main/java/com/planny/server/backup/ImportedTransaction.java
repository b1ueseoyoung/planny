package com.planny.server.backup;

import com.planny.server.ledger.TransactionRequest;
import com.planny.server.shared.Category;
import com.planny.server.shared.Won;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.UUID;
import org.jspecify.annotations.Nullable;

/**
 * 기기에서 올리는 거래 (types.ts의 Transaction).
 *
 * @param id 기기에서 만든 id(tx_0001 등). 서버는 새 id를 만든다
 * @param eventId 같은 요청 안의 일정 id
 */
record ImportedTransaction(
        @NotBlank @Size(max = 100) String id,
        @NotNull LocalDate date,
        @Positive @Max(Won.MAX) long amount,
        @NotNull Category category,
        @NotNull @Size(max = 100) String merchant,
        @Nullable @Size(max = 100) String eventId) {

    TransactionRequest toRequest(@Nullable UUID serverEventId) {
        return new TransactionRequest(date, amount, category, merchant, serverEventId);
    }
}
