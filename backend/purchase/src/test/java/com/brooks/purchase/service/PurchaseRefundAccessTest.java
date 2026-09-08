package com.brooks.purchase.service;

import com.brooks.guide.service.GuidePurchaseService;
import com.brooks.guide.repository.GuideRepository;
import com.brooks.profile.repository.UserProfileRepository;
import com.brooks.purchase.domain.*;
import com.brooks.purchase.repository.PurchaseRepository;
import com.brooks.social.repository.FollowRepository;
import com.brooks.user.service.UserService;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.transaction.PlatformTransactionManager;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PurchaseRefundAccessTest {
    @Test void fullRefundRevokesAccessButPartialRefundDoesNot() {
        for (boolean partial : new boolean[]{false, true}) {
            var repository = mock(PurchaseRepository.class);
            var guides = mock(GuidePurchaseService.class);
            var earnings = mock(CreatorEarningsRecorder.class);
            var purchase = new Purchase();
            purchase.setId(UUID.randomUUID()); purchase.setBuyerId(UUID.randomUUID());
            purchase.setStatus(PurchaseStatus.COMPLETED);
            when(repository.findByBogOrderIdForUpdate("order")).thenReturn(Optional.of(purchase));
            when(earnings.reverseForRefund(purchase.getId(), partial)).thenReturn(CreatorEarningsRecorder.RefundOutcome.NO_EARNING);
            var service = new PurchaseService(repository, mock(GuideRepository.class), mock(UserProfileRepository.class),
                    mock(UserService.class), mock(BogIpayClient.class), mock(CommissionRateResolver.class),
                    mock(FollowRepository.class), mock(ApplicationEventPublisher.class), mock(PlatformTransactionManager.class),
                    mock(PurchaseAuditWriter.class), earnings, guides, mock(FxRateService.class), mock(PurchaseFulfillmentService.class));
            service.handleCheckoutRefunded("order", "10.00", partial);
            assertEquals(partial ? PurchaseStatus.COMPLETED : PurchaseStatus.REFUNDED, purchase.getStatus());
            if (partial) verifyNoInteractions(guides);
            else verify(guides).revokeFinancialAccess(purchase.getId(), purchase.getBuyerId());
        }
    }
}
