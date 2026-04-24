package com.cubinghub.domain.record.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.nullable;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.when;

import com.querydsl.core.Tuple;
import com.querydsl.core.types.EntityPath;
import com.querydsl.core.types.Predicate;
import com.querydsl.core.types.dsl.NumberExpression;
import com.querydsl.jpa.impl.JPAQuery;
import com.querydsl.jpa.impl.JPAQueryFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
@DisplayName("RecordRepositoryImpl 단위 테스트")
class RecordRepositoryImplTest {

    @Mock
    private JPAQueryFactory queryFactory;

    @Mock
    private JPAQuery<Long> countQuery;

    @Mock
    private JPAQuery<Tuple> summaryQuery;

    private RecordRepositoryImpl recordRepository;

    @BeforeEach
    void setUp() {
        recordRepository = new RecordRepositoryImpl(queryFactory);
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    @Test
    @DisplayName("summary query 결과가 모두 null이면 0건과 null 집계로 보정한다")
    void should_return_zero_count_and_null_aggregates_when_summary_queries_return_null() {
        when(queryFactory.select(any(NumberExpression.class))).thenReturn((JPAQuery) countQuery);
        when(queryFactory.select(any(NumberExpression.class), any(NumberExpression.class))).thenReturn((JPAQuery) summaryQuery);
        when(countQuery.from(any(EntityPath.class))).thenReturn(countQuery);
        doReturn(countQuery).when(countQuery).where(nullable(Predicate.class));
        when(countQuery.fetchOne()).thenReturn(null);
        when(summaryQuery.from(any(EntityPath.class))).thenReturn(summaryQuery);
        doReturn(summaryQuery).when(summaryQuery).where(nullable(Predicate.class), nullable(Predicate.class));
        when(summaryQuery.fetchOne()).thenReturn(null);

        RecordSummaryQueryResult result = recordRepository.findSummaryByUserId(1L);

        assertThat(result.totalSolveCount()).isZero();
        assertThat(result.personalBestTimeMs()).isNull();
        assertThat(result.averageTimeMs()).isNull();
    }
}
