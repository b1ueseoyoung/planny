package com.planny.server.backup;

import com.planny.server.account.Profile;
import com.planny.server.account.ProfileService;
import com.planny.server.ledger.TransactionRequest;
import com.planny.server.ledger.TransactionService;
import com.planny.server.schedule.EventResponse;
import com.planny.server.schedule.EventService;
import com.planny.server.shared.ApiException;
import com.planny.server.shared.DateRange;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class BackupService {

    private final ProfileService profiles;

    private final EventService events;

    private final TransactionService transactions;

    BackupService(ProfileService profiles, EventService events, TransactionService transactions) {
        this.profiles = profiles;
        this.events = events;
        this.transactions = transactions;
    }

    @Transactional(readOnly = true)
    AppDataResponse export(UUID userId) {
        Profile profile = profiles.get(userId);
        return new AppDataResponse(profile.userName(), profile.budget(),
                transactions.list(userId, DateRange.all()), events.list(userId, DateRange.all()));
    }

    /**
     * 내 데이터를 요청 내용으로 모두 바꾼다. 한 트랜잭션이라 중간에 실패하면 아무것도 바뀌지 않는다.
     * 일정과 거래는 새 id를 받고, 거래의 eventId도 새 일정 id로 바꿔 연결을 유지한다.
     * 요청 안에 없는 일정을 가리키는 eventId는 연결을 끊는다(일정을 지웠을 때와 같다).
     */
    @Transactional
    AppDataResponse replace(UUID userId, AppDataRequest request) {
        List<ImportedEvent> importedEvents = request.events();
        checkUniqueEventIds(importedEvents);

        List<EventResponse> created = events.replaceAll(userId,
                importedEvents.stream().map(ImportedEvent::toRequest).toList());
        Map<String, UUID> serverEventIds = new HashMap<>();
        for (int i = 0; i < importedEvents.size(); i++) {
            serverEventIds.put(importedEvents.get(i).id(), created.get(i).id());
        }

        List<TransactionRequest> transactionRequests = request.transactions().stream()
                .map(transaction -> {
                    String eventId = transaction.eventId();
                    return transaction.toRequest(eventId == null ? null : serverEventIds.get(eventId));
                })
                .toList();
        transactions.replaceAll(userId, transactionRequests);
        profiles.replace(userId, new Profile(request.userName(), request.budget()));
        return export(userId);
    }

    private static void checkUniqueEventIds(List<ImportedEvent> importedEvents) {
        Map<String, Integer> seen = new HashMap<>();
        for (int i = 0; i < importedEvents.size(); i++) {
            if (seen.putIfAbsent(importedEvents.get(i).id(), i) != null) {
                throw ApiException.invalidField("events[" + i + "].id", "같은 id의 일정이 이미 있습니다.");
            }
        }
    }
}
