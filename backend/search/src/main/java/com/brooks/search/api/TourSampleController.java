package com.brooks.search.api;

import com.brooks.guide.domain.Guide;
import com.brooks.guide.domain.GuideStatus;
import com.brooks.guide.repository.GuideRepository;
import com.brooks.user.domain.User;
import com.brooks.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Optional;

/**
 * Helpers for the onboarding tour to land on REAL prod data without hardcoding
 * a username. The tour calls /api/tour/sample-creator on step entry and
 * navigates to that creator's profile.
 */
@RestController
@RequestMapping("/api/tour")
@RequiredArgsConstructor
public class TourSampleController {

    private final GuideRepository guideRepository;
    private final UserRepository userRepository;

    @GetMapping("/sample-creator")
    public ResponseEntity<SampleCreatorResponse> sampleCreator() {
        Optional<Guide> firstGuide = guideRepository.findFirstByStatusOrderByCreatedAtAsc(GuideStatus.PUBLISHED);
        if (firstGuide.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Optional<User> creator = userRepository.findById(firstGuide.get().getCreatorId());
        if (creator.isEmpty() || creator.get().getUsername() == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(new SampleCreatorResponse(creator.get().getUsername()));
    }

    public record SampleCreatorResponse(String username) {}
}
