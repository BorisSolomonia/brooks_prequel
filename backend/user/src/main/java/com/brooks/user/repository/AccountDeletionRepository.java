package com.brooks.user.repository;

import com.brooks.user.domain.AccountDeletion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface AccountDeletionRepository extends JpaRepository<AccountDeletion, Long> {
    Optional<AccountDeletion> findFirstByUserIdOrderByRequestedAtDesc(UUID userId);
}
