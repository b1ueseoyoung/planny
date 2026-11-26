package com.planny.server.schedule;

import com.planny.server.shared.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;
import org.jspecify.annotations.Nullable;

@Entity
@Table(name = "events")
class CalendarEvent extends BaseEntity {

    @Column(updatable = false)
    private UUID userId;

    private String title;

    private LocalDate startDate;

    private LocalDate endDate;

    private EventType eventType;

    private @Nullable String location;

    /** text[] */
    @JdbcTypeCode(SqlTypes.ARRAY)
    private List<String> people;

    /** jsonb */
    @JdbcTypeCode(SqlTypes.JSON)
    private @Nullable EventPrediction prediction;

    private @Nullable PredictionSource predictionSource;

    // DB 기록용 시각. Hibernate가 저장할 때 채운다
    @CreationTimestamp
    @SuppressWarnings("UnusedVariable")
    private @Nullable Instant createdAt;

    @UpdateTimestamp
    @SuppressWarnings("UnusedVariable")
    private @Nullable Instant updatedAt;

    protected CalendarEvent() {
    }

    CalendarEvent(UUID userId, EventRequest request) {
        this.userId = userId;
        assign(request);
    }

    /** 요청 내용으로 모두 바꾼다 (PUT) */
    void apply(EventRequest request) {
        assign(request);
    }

    private void assign(EventRequest request) {
        this.title = request.title().strip();
        this.startDate = request.startDate();
        this.endDate = request.endDate();
        this.eventType = request.eventType();
        String location = request.location();
        this.location = (location == null || location.isBlank()) ? null : location.strip();
        List<String> people = request.people();
        this.people = people == null ? List.of() : people.stream().map(String::strip).toList();
        this.prediction = request.prediction();
        this.predictionSource = request.source();
    }

    String getTitle() {
        return title;
    }

    LocalDate getStartDate() {
        return startDate;
    }

    LocalDate getEndDate() {
        return endDate;
    }

    EventType getEventType() {
        return eventType;
    }

    @Nullable String getLocation() {
        return location;
    }

    List<String> getPeople() {
        return people;
    }

    @Nullable EventPrediction getPrediction() {
        return prediction;
    }

    @Nullable PredictionSource getPredictionSource() {
        return predictionSource;
    }
}
