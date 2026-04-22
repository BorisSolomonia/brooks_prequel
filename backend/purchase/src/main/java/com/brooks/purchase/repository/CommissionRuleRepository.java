package com.brooks.purchase.repository;

import com.brooks.purchase.domain.CommissionRule;
import com.brooks.purchase.domain.CommissionRuleType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CommissionRuleRepository extends JpaRepository<CommissionRule, UUID> {

    Optional<CommissionRule> findFirstByRuleTypeAndActiveTrue(CommissionRuleType ruleType);

    Optional<CommissionRule> findFirstByRuleTypeAndRegionIgnoreCaseAndActiveTrue(CommissionRuleType ruleType, String region);

    Optional<CommissionRule> findFirstByRuleTypeAndCreatorIdAndActiveTrue(CommissionRuleType ruleType, UUID creatorId);

    List<CommissionRule> findAllByActiveTrue();
}
