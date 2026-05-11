package com.brooks.user.api;

import com.brooks.auth.service.AuthService;
import com.brooks.user.domain.User;
import com.brooks.user.dto.PayoutDetailsRequest;
import com.brooks.user.dto.PayoutDetailsResponse;
import com.brooks.user.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/me/payout")
@RequiredArgsConstructor
public class PayoutController {

    private final UserService userService;
    private final AuthService authService;

    @GetMapping
    public ResponseEntity<PayoutDetailsResponse> getPayoutDetails(Authentication authentication) {
        String subject = authService.extractSubject(authentication);
        User user = userService.findByAuth0Subject(subject);
        return ResponseEntity.ok(toResponse(user));
    }

    @PutMapping
    public ResponseEntity<PayoutDetailsResponse> updatePayoutDetails(
            Authentication authentication,
            @Valid @RequestBody PayoutDetailsRequest req
    ) {
        String subject = authService.extractSubject(authentication);
        User user = userService.updatePayoutDetails(
                subject,
                req.getPayoutIban(),
                req.getPayoutBeneficiaryName(),
                req.getPayoutCurrency()
        );
        return ResponseEntity.ok(toResponse(user));
    }

    private static PayoutDetailsResponse toResponse(User user) {
        return PayoutDetailsResponse.builder()
                .payoutIban(user.getPayoutIban())
                .payoutBeneficiaryName(user.getPayoutBeneficiaryName())
                .payoutCurrency(user.getPayoutCurrency())
                .build();
    }
}
