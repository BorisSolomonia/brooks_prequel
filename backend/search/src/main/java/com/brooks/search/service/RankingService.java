package com.brooks.search.service;

import com.brooks.search.dto.RankedCreator;
import com.brooks.search.dto.RegionalRankingResponse;
import com.brooks.search.repository.SearchRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RankingService {

    private final SearchRepository searchRepository;

    public RegionalRankingResponse getRegionalRanking(String region, int page, int size) {
        long total = searchRepository.countRegionalCreators(region);
        List<RankedCreator> creators = searchRepository.getRegionalRanking(region, size, page * size);
        return RegionalRankingResponse.builder()
                .region(region)
                .creators(creators)
                .total(total)
                .build();
    }
}
