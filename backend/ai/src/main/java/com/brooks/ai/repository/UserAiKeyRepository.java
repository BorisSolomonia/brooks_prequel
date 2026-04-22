package com.brooks.ai.repository;

import com.brooks.ai.domain.UserAiKey;
import com.brooks.ai.provider.AiProvider;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserAiKeyRepository extends JpaRepository<UserAiKey, UUID> {

    List<UserAiKey> findAllByUserId(UUID userId);

    Optional<UserAiKey> findByUserIdAndProvider(UUID userId, AiProvider provider);

    void deleteByUserIdAndProvider(UUID userId, AiProvider provider);
}
