package com.brooks.memory.repository;

import com.brooks.memory.domain.ProductEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface ProductEventRepository extends JpaRepository<ProductEvent, UUID> {
}
