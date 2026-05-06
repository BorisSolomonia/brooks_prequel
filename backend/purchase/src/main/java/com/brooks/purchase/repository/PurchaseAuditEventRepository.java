package com.brooks.purchase.repository;

import com.brooks.purchase.domain.PurchaseAuditEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PurchaseAuditEventRepository extends JpaRepository<PurchaseAuditEvent, UUID> {

    List<PurchaseAuditEvent> findByPurchaseIdOrderByOccurredAtAsc(UUID purchaseId);
}
