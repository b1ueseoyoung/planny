package com.planny.server.schedule;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

interface CalendarEventRepository extends JpaRepository<CalendarEvent, UUID> {

    Optional<CalendarEvent> findByIdAndUserId(UUID id, UUID userId);

    boolean existsByIdAndUserId(UUID id, UUID userId);

    /** [from, to] 기간과 하루라도 겹치는 일정 */
    @Query("""
            select e from CalendarEvent e
            where e.userId = :userId and e.startDate <= :to and e.endDate >= :from
            order by e.startDate, e.id""")
    List<CalendarEvent> findOverlapping(UUID userId, LocalDate from, LocalDate to);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("delete from CalendarEvent e where e.userId = :userId")
    int deleteAllByUserId(UUID userId);
}
