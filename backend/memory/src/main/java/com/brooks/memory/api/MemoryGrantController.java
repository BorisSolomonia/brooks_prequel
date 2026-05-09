package com.brooks.memory.api;

import com.brooks.memory.service.MemoryGrantService;
import com.brooks.user.domain.User;
import com.brooks.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class MemoryGrantController {

    private final MemoryGrantService memoryGrantService;
    private final UserService userService;

    @DeleteMapping("/memory-grants/{memoryId}")
    public ResponseEntity<Void> removeGrant(Authentication authentication, @PathVariable UUID memoryId) {
        String subject = ((Jwt) authentication.getPrincipal()).getSubject();
        User viewer = userService.findByAuth0Subject(subject);
        memoryGrantService.removeForBeneficiary(memoryId, viewer.getId());
        return ResponseEntity.noContent().build();
    }
}
