package com.planny.server.ledger;

import com.planny.server.schedule.EventService;
import com.planny.server.shared.ApiException;
import com.planny.server.shared.DateRange;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 거래 모듈의 공개 API. 모든 메서드는 그 사용자의 거래만 다룬다. */
@Service
public class TransactionService {

    private final TransactionRepository transactions;

    private final EventService events;

    TransactionService(TransactionRepository transactions, EventService events) {
        this.transactions = transactions;
        this.events = events;
    }

    /** 기간 안(양 끝 포함)의 거래를 날짜 순으로 */
    @Transactional(readOnly = true)
    public List<TransactionResponse> list(UUID userId, DateRange range) {
        return transactions.findInRange(userId, range.from(), range.to()).stream()
                .map(TransactionResponse::of)
                .toList();
    }

    @Transactional(readOnly = true)
    public TransactionResponse get(UUID userId, UUID transactionId) {
        return TransactionResponse.of(find(userId, transactionId));
    }

    @Transactional
    public TransactionResponse create(UUID userId, TransactionRequest request) {
        checkEventBelongsToUser(userId, request);
        return TransactionResponse.of(transactions.save(new Transaction(userId, request)));
    }

    @Transactional
    public TransactionResponse update(UUID userId, UUID transactionId, TransactionRequest request) {
        checkEventBelongsToUser(userId, request);
        Transaction transaction = find(userId, transactionId);
        transaction.apply(request);
        return TransactionResponse.of(transaction);
    }

    @Transactional
    public void delete(UUID userId, UUID transactionId) {
        transactions.delete(find(userId, transactionId));
    }

    /** 이 사용자의 거래를 모두 지우고 새로 만든다. 요청은 @Valid로 검증한 것이어야 한다. */
    @Transactional
    public List<TransactionResponse> replaceAll(UUID userId, List<TransactionRequest> requests) {
        requests.stream()
                .map(TransactionRequest::eventId)
                .filter(Objects::nonNull)
                .distinct()
                .filter(eventId -> !events.exists(userId, eventId))
                .findAny()
                .ifPresent(eventId -> {
                    throw ApiException.invalidField("eventId", "연결할 일정을 찾을 수 없습니다: " + eventId);
                });
        transactions.deleteAllByUserId(userId);
        List<Transaction> created = requests.stream().map(request -> new Transaction(userId, request)).toList();
        return transactions.saveAll(created).stream().map(TransactionResponse::of).toList();
    }

    private Transaction find(UUID userId, UUID transactionId) {
        // 다른 사람의 거래도 "없음"으로 답해서 존재 여부가 드러나지 않게 한다
        return transactions.findByIdAndUserId(transactionId, userId)
                .orElseThrow(() -> ApiException.notFound("거래를 찾을 수 없습니다."));
    }

    private void checkEventBelongsToUser(UUID userId, TransactionRequest request) {
        UUID eventId = request.eventId();
        if (eventId != null && !events.exists(userId, eventId)) {
            throw ApiException.invalidField("eventId", "연결할 일정을 찾을 수 없습니다.");
        }
    }
}
