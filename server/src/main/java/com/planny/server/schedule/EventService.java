package com.planny.server.schedule;

import com.planny.server.shared.ApiException;
import com.planny.server.shared.DateRange;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 일정 모듈의 공개 API. 모든 메서드는 그 사용자의 일정만 다룬다. */
@Service
public class EventService {

    private final CalendarEventRepository events;

    EventService(CalendarEventRepository events) {
        this.events = events;
    }

    /** 기간과 하루라도 겹치는 일정을 시작 날짜 순으로 */
    @Transactional(readOnly = true)
    public List<EventResponse> list(UUID userId, DateRange range) {
        return events.findOverlapping(userId, range.from(), range.to()).stream().map(EventResponse::of).toList();
    }

    @Transactional(readOnly = true)
    public EventResponse get(UUID userId, UUID eventId) {
        return EventResponse.of(find(userId, eventId));
    }

    /** 요청은 @Valid로 검증한 것이어야 한다 */
    @Transactional
    public EventResponse create(UUID userId, EventRequest request) {
        return EventResponse.of(events.save(new CalendarEvent(userId, request)));
    }

    @Transactional
    public EventResponse update(UUID userId, UUID eventId, EventRequest request) {
        CalendarEvent event = find(userId, eventId);
        event.apply(request);
        return EventResponse.of(event);
    }

    /** 일정을 지워도 연결된 거래는 남고 연결만 끊긴다(DB의 ON DELETE SET NULL). */
    @Transactional
    public void delete(UUID userId, UUID eventId) {
        events.delete(find(userId, eventId));
    }

    /**
     * 이 사용자의 일정을 모두 지우고 새로 만든다. 돌려주는 목록은 요청과 같은 순서라서,
     * 호출한 쪽이 예전 id와 새 id를 짝지을 수 있다. 요청은 @Valid로 검증한 것이어야 한다.
     */
    @Transactional
    public List<EventResponse> replaceAll(UUID userId, List<EventRequest> requests) {
        events.deleteAllByUserId(userId);
        List<CalendarEvent> created = requests.stream().map(request -> new CalendarEvent(userId, request)).toList();
        return events.saveAll(created).stream().map(EventResponse::of).toList();
    }

    /** 이 사용자의 일정인지. 거래를 일정에 연결할 때 쓴다 */
    @Transactional(readOnly = true)
    public boolean exists(UUID userId, UUID eventId) {
        return events.existsByIdAndUserId(eventId, userId);
    }

    private CalendarEvent find(UUID userId, UUID eventId) {
        // 다른 사람의 일정도 "없음"으로 답해서 존재 여부가 드러나지 않게 한다
        return events.findByIdAndUserId(eventId, userId)
                .orElseThrow(() -> ApiException.notFound("일정을 찾을 수 없습니다."));
    }
}
