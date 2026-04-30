package com.brooks.memory.service;

import com.brooks.memory.domain.ProductEvent;
import com.brooks.memory.repository.ProductEventRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.UUID;

@Service
@Slf4j
public class ProductEventService {

    private final ProductEventRepository productEventRepository;
    private final TransactionTemplate transactionTemplate;

    public ProductEventService(ProductEventRepository productEventRepository, PlatformTransactionManager transactionManager) {
        this.productEventRepository = productEventRepository;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
        this.transactionTemplate.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    public void record(String eventName, UUID actorId, UUID memoryId, String shareToken, String source) {
        try {
            transactionTemplate.executeWithoutResult(status ->
                    productEventRepository.save(new ProductEvent(eventName, actorId, memoryId, shareToken, source)));
        } catch (RuntimeException ex) {
            log.warn("Product event recording failed for eventName={}, actorId={}, memoryId={}",
                    eventName, actorId, memoryId, ex);
        }
    }
}
