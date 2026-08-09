package com.brooks.community.repository;

import com.brooks.community.domain.CommunityConsent;
import com.brooks.community.domain.ConsentPurpose;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface CommunityConsentRepository extends JpaRepository<CommunityConsent, UUID> {

    Optional<CommunityConsent> findByUserIdAndPurpose(UUID userId, ConsentPurpose purpose);
}
