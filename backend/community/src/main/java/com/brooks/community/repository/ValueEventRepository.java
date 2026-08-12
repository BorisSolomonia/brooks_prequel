package com.brooks.community.repository;

import com.brooks.community.domain.ValueEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface ValueEventRepository extends JpaRepository<ValueEvent, UUID> {

    /** Idempotent capture: the same (type+source+actor) event is recorded at most once. */
    boolean existsByIdempotencyKey(String idempotencyKey);
}
