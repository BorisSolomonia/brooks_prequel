package com.brooks.guide.repository;

import com.brooks.guide.domain.UserCalendarConnection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserCalendarConnectionRepository extends JpaRepository<UserCalendarConnection, UUID> {

    Optional<UserCalendarConnection> findByUserIdAndProvider(UUID userId, String provider);

    void deleteByUserIdAndProvider(UUID userId, String provider);
}
