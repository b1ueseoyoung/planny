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

    @Transactional
    public EventResponse create(UUID userId, EventRequest request) {
        validate(request);
        return EventResponse.of(events.save(new CalendarEvent(userId, request)));
    }

    @Transactional
    public EventResponse update(UUID userId, UUID eventId, EventRequest request) {
        validate(request);
        CalendarEvent event = find(userId, eventId);
        event.apply(request);
        return EventResponse.of(event);
    }

    /** 일정을 지워도 연결된 거래는 남고 연결만 끊긴다(DB의 ON DELETE SET NULL). */
    @Transactional
    public void delete(UUID userId, UUID eventId) {
        events.delete(find(userId, eventId));
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

    private static void validate(EventRequest request) {
        if (request.endDate().isBefore(request.startDate())) {
            throw ApiException.invalidField("endDate", "끝 날짜는 시작 날짜와 같거나 뒤여야 합니다.");
        }
    }
}
