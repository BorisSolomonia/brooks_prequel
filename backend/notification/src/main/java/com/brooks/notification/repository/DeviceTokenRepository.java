package com.brooks.notification.repository;

import com.brooks.notification.domain.DeviceToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DeviceTokenRepository extends JpaRepository<DeviceToken, UUID> {

    Optional<DeviceToken> findByToken(String token);

    List<DeviceToken> findAllByUserId(UUID userId);

    @Modifying
    @Query("DELETE FROM DeviceToken d WHERE d.token = :token")
    void deleteByToken(@Param("token") String token);

    @Modifying
    @Query("DELETE FROM DeviceToken d WHERE d.userId = :userId")
    void deleteAllByUserId(@Param("userId") UUID userId);
}
