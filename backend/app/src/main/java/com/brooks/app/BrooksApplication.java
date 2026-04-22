package com.brooks.app;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication(scanBasePackages = "com.brooks")
@EntityScan(basePackages = "com.brooks")
@EnableJpaRepositories(basePackages = "com.brooks")
@EnableCaching
public class BrooksApplication {
    public static void main(String[] args) {
        SpringApplication.run(BrooksApplication.class, args);
    }
}
