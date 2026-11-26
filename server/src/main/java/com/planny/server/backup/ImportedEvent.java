package com.planny.server.backup;

import com.planny.server.schedule.EventPrediction;
import com.planny.server.schedule.EventRequest;
import com.planny.server.schedule.EventType;
import com.planny.server.schedule.PredictionSource;
import com.planny.server.shared.DatePeriod;
import com.planny.server.shared.EndDateNotBeforeStartDate;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;
import org.jspecify.annotations.Nullable;

/**
 * 기기에서 올리는 일정 (types.ts의 CalendarEvent).
 *
 * @param id 기기에서 만든 id(evt_1a2b3c4d 등). 서버는 새 id를 만들고, 거래의 eventId도 새 id로 바꾼다
 */
@EndDateNotBeforeStartDate
record ImportedEvent(
        @NotBlank @Size(max = 100) String id,
        @NotBlank @Size(max = 200) String title,
        @NotNull LocalDate startDate,
        @NotNull LocalDate endDate,
        @NotNull EventType eventType,
        @Nullable @Size(max = 100) String location,
        @Nullable @Size(max = 30) List<@NotBlank @Size(max = 30) String> people,
        @Nullable @Valid EventPrediction prediction,
        @Nullable PredictionSource source) implements DatePeriod {

    EventRequest toRequest() {
        return new EventRequest(title, startDate, endDate, eventType, location, people, prediction, source);
    }
}
