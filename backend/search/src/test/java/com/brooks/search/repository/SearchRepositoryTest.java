package com.brooks.search.repository;

import com.brooks.search.dto.GuideSearchResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class SearchRepositoryTest {

    private JdbcTemplate jdbcTemplate;
    private SearchRepository repository;

    @BeforeEach
    void setUp() {
        jdbcTemplate = mock(JdbcTemplate.class);
        repository = new SearchRepository(jdbcTemplate);
    }

    @Test
    @SuppressWarnings({"unchecked", "rawtypes"})
    void guideDiscoveryAggregatesChildTablesIndependently() {
        when(jdbcTemplate.query(anyString(), any(RowMapper.class), any(Object[].class)))
                .thenReturn(List.of());

        repository.searchGuides(null, 20, 0, null, List.of(), null, null, null, null);

        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).query(sql.capture(), any(RowMapper.class), any(Object[].class));

        assertThat(sql.getValue())
                .contains("LEFT JOIN LATERAL")
                .contains("review_stats")
                .contains("purchase_stats")
                .contains("save_stats")
                .doesNotContain("LEFT JOIN guide_reviews gr ON")
                .doesNotContain("COUNT(DISTINCT")
                .doesNotContain(" GROUP BY ");
    }

    @Test
    @SuppressWarnings({"unchecked", "rawtypes"})
    void catalogQueryUsesTheSameNonMultiplyingStatisticsShape() {
        when(jdbcTemplate.query(anyString(), any(RowMapper.class), any(Object[].class)))
                .thenReturn(List.of());

        repository.listPublishedGuides(50, 0);

        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).query(sql.capture(), any(RowMapper.class), any(Object[].class));

        assertThat(sql.getValue())
                .contains("LEFT JOIN LATERAL")
                .contains("review_stats")
                .doesNotContain("COUNT(DISTINCT")
                .doesNotContain("GROUP BY g.id");
    }
}