package com.brooks.search.service;

import com.brooks.search.dto.RankedCreator;
import com.brooks.search.dto.RegionalRankingResponse;
import com.brooks.search.repository.SearchRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RankingService {

    private final SearchRepository searchRepository;

    // Public ranking — same value for everyone in a region. Cache in "rankings" Caffeine
    // (5 min TTL, see CacheConfig). The ranking-refresh cron should invalidate this cache
    // once it lands; for now the TTL keeps things fresh enough.
    @Cacheable(value = "rankings", key = "'regional:' + (#region == null ? 'global' : #region) + ':' + #page + ':' + #size")
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
