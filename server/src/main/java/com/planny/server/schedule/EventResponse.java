package com.planny.server.schedule;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.jspecify.annotations.Nullable;

/** types.ts의 CalendarEvent와 같은 모양 */
public record EventResponse(
        UUID id,
        String title,
        LocalDate startDate,
        LocalDate endDate,
        EventType eventType,
        @Nullable String location,
        List<String> people,
        @Nullable EventPrediction prediction,
        @Nullable PredictionSource source) {

    static EventResponse of(CalendarEvent event) {
        return new EventResponse(event.getId(), event.getTitle(), event.getStartDate(), event.getEndDate(),
                event.getEventType(), event.getLocation(), event.getPeople(), event.getPrediction(),
                event.getPredictionSource());
    }
}
