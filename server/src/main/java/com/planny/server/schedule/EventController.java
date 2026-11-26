package com.planny.server.schedule;

import com.planny.server.shared.CurrentUser;
import com.planny.server.shared.DateRange;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.net.URI;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.jspecify.annotations.Nullable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

@Tag(name = "일정")
@RestController
@RequestMapping(path = "/api/{version}/events", version = "v1")
class EventController {

    private final EventService eventService;

    EventController(EventService eventService) {
        this.eventService = eventService;
    }

    /** 기간(YYYY-MM-DD, 양 끝 포함)과 하루라도 겹치는 일정. 기간을 빼면 모든 일정 */
    @GetMapping
    List<EventResponse> list(@CurrentUser UUID userId,
            @RequestParam(required = false) @Nullable LocalDate from,
            @RequestParam(required = false) @Nullable LocalDate to) {
        return eventService.list(userId, DateRange.of(from, to));
    }

    @GetMapping("/{id}")
    EventResponse get(@CurrentUser UUID userId, @PathVariable UUID id) {
        return eventService.get(userId, id);
    }

    @PostMapping
    ResponseEntity<EventResponse> create(@CurrentUser UUID userId, @Valid @RequestBody EventRequest request) {
        EventResponse created = eventService.create(userId, request);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest().path("/{id}").buildAndExpand(created.id()).toUri();
        return ResponseEntity.created(location).body(created);
    }

    /** 일정을 통째로 바꾼다. 보내지 않은 선택 필드(location, people, prediction, source)는 비워진다 */
    @PutMapping("/{id}")
    EventResponse update(@CurrentUser UUID userId, @PathVariable UUID id, @Valid @RequestBody EventRequest request) {
        return eventService.update(userId, id, request);
    }

    /** 일정을 지운다. 연결된 거래는 남고 연결만 끊긴다 */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@CurrentUser UUID userId, @PathVariable UUID id) {
        eventService.delete(userId, id);
    }
}
