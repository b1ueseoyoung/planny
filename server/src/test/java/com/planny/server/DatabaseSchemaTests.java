package com.planny.server;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDate;
import java.util.UUID;
import org.jspecify.annotations.Nullable;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.simple.JdbcClient;

/** 앱 코드를 거치지 않아도 DB가 스스로 지키는 규칙을 확인한다. */
@Import(TestcontainersConfiguration.class)
@SpringBootTest
class DatabaseSchemaTests {

    @Autowired
    JdbcClient jdbc;

    @Test
    void transactionCannotLinkToAnotherUsersEvent() {
        UUID me = insertUser();
        UUID other = insertUser();
        UUID othersEvent = insertEvent(other);

        assertThatThrownBy(() -> insertTransaction(me, 10_000, "meal", othersEvent))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void deletingEventKeepsTransactionButUnlinksIt() {
        UUID me = insertUser();
        UUID event = insertEvent(me);
        UUID transaction = insertTransaction(me, 32_000, "meal", event);

        jdbc.sql("DELETE FROM events WHERE id = ?").param(event).update();

        assertThat(jdbc.sql("SELECT count(*) FROM transactions WHERE id = ? AND event_id IS NULL")
                .param(transaction).query(Long.class).single()).isEqualTo(1L);
    }

    @Test
    void deletingUserDeletesAllTheirData() {
        UUID me = insertUser();
        UUID event = insertEvent(me);
        insertTransaction(me, 32_000, "meal", event);
        insertTransaction(me, 4_500, "cafe", null);

        jdbc.sql("DELETE FROM users WHERE id = ?").param(me).update();

        assertThat(countByUser("events", me)).isZero();
        assertThat(countByUser("transactions", me)).isZero();
    }

    @Test
    void rejectsValuesTheAppNeverStores() {
        UUID me = insertUser();

        assertThatThrownBy(() -> insertTransaction(me, 0, "meal", null))
                .as("금액 0원").isInstanceOf(DataIntegrityViolationException.class);
        assertThatThrownBy(() -> insertTransaction(me, 1_000, "coffee", null))
                .as("없는 카테고리").isInstanceOf(DataIntegrityViolationException.class);
        assertThatThrownBy(() -> jdbc.sql("""
                        INSERT INTO events (id, user_id, title, start_date, end_date, event_type)
                        VALUES (?, ?, '여행', DATE '2026-12-03', DATE '2026-12-01', 'travel')""")
                .params(UUID.randomUUID(), me).update())
                .as("끝 날짜가 시작 날짜보다 앞섬").isInstanceOf(DataIntegrityViolationException.class);

        String email = UUID.randomUUID() + "@example.com";
        insertUser(email);
        assertThatThrownBy(() -> insertUser(email))
                .as("이미 있는 이메일").isInstanceOf(DataIntegrityViolationException.class);
    }

    private UUID insertUser() {
        return insertUser(UUID.randomUUID() + "@example.com");
    }

    private UUID insertUser(String email) {
        UUID id = UUID.randomUUID();
        jdbc.sql("INSERT INTO users (id, email, password_hash, user_name, budget) VALUES (?, ?, 'hash', '나', 1200000)")
                .params(id, email).update();
        return id;
    }

    private UUID insertEvent(UUID userId) {
        UUID id = UUID.randomUUID();
        jdbc.sql("""
                INSERT INTO events (id, user_id, title, start_date, end_date, event_type, people)
                VALUES (?, ?, '성수동 친구 모임', ?, ?, 'friends', ARRAY['민지', '서준'])""")
                .params(id, userId, LocalDate.of(2026, 12, 5), LocalDate.of(2026, 12, 5)).update();
        return id;
    }

    private UUID insertTransaction(UUID userId, long amount, String category, @Nullable UUID eventId) {
        UUID id = UUID.randomUUID();
        jdbc.sql("""
                INSERT INTO transactions (id, user_id, spent_on, amount, category, merchant, event_id)
                VALUES (?, ?, DATE '2026-12-05', ?, ?, '성수 파스타', ?)""")
                .param(id).param(userId).param(amount).param(category).param(eventId)
                .update();
        return id;
    }

    private long countByUser(String table, UUID userId) {
        return jdbc.sql("SELECT count(*) FROM " + table + " WHERE user_id = ?").param(userId).query(Long.class).single();
    }
}
