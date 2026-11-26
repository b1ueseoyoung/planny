package com.planny.server.ledger;

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

@Tag(name = "거래")
@RestController
@RequestMapping(path = "/api/{version}/transactions", version = "v1")
class TransactionController {

    private final TransactionService transactionService;

    TransactionController(TransactionService transactionService) {
        this.transactionService = transactionService;
    }

    /** 기간(YYYY-MM-DD, 양 끝 포함) 안의 거래. 기간을 빼면 모든 거래 */
    @GetMapping
    List<TransactionResponse> list(@CurrentUser UUID userId,
            @RequestParam(required = false) @Nullable LocalDate from,
            @RequestParam(required = false) @Nullable LocalDate to) {
        return transactionService.list(userId, DateRange.of(from, to));
    }

    @GetMapping("/{id}")
    TransactionResponse get(@CurrentUser UUID userId, @PathVariable UUID id) {
        return transactionService.get(userId, id);
    }

    @PostMapping
    ResponseEntity<TransactionResponse> create(@CurrentUser UUID userId,
            @Valid @RequestBody TransactionRequest request) {
        TransactionResponse created = transactionService.create(userId, request);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest().path("/{id}").buildAndExpand(created.id()).toUri();
        return ResponseEntity.created(location).body(created);
    }

    /** 거래를 통째로 바꾼다. eventId를 빼면 일정 연결이 끊긴다 */
    @PutMapping("/{id}")
    TransactionResponse update(@CurrentUser UUID userId, @PathVariable UUID id,
            @Valid @RequestBody TransactionRequest request) {
        return transactionService.update(userId, id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@CurrentUser UUID userId, @PathVariable UUID id) {
        transactionService.delete(userId, id);
    }
}
