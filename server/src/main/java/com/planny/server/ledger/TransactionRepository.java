package com.planny.server.ledger;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

interface TransactionRepository extends JpaRepository<Transaction, UUID> {

    Optional<Transaction> findByIdAndUserId(UUID id, UUID userId);

    @Query("""
            select t from Transaction t
            where t.userId = :userId and t.spentOn between :from and :to
            order by t.spentOn, t.id""")
    List<Transaction> findInRange(UUID userId, LocalDate from, LocalDate to);
}
