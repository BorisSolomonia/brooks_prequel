package com.brooks.search.api;

import com.brooks.search.dto.RegionalRankingResponse;
import com.brooks.search.service.RankingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/rankings")
@RequiredArgsConstructor
public class RankingController {

    private final RankingService rankingService;

    @GetMapping("/creators")
    public ResponseEntity<RegionalRankingResponse> getRegionalRanking(
            @RequestParam(name = "region") String region,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size) {
        return ResponseEntity.ok(rankingService.getRegionalRanking(region, page, Math.min(size, 50)));
    }
}
