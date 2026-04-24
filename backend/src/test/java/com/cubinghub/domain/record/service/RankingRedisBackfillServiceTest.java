package com.cubinghub.domain.record.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.cubinghub.domain.record.dto.internal.RankingRedisEntry;
import com.cubinghub.domain.record.entity.EventType;
import com.cubinghub.domain.record.repository.RankingRedisRepository;
import com.cubinghub.domain.record.repository.UserPBRepository;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
@DisplayName("RankingRedisBackfillService 단위 테스트")
class RankingRedisBackfillServiceTest {

    @Mock
    private UserPBRepository userPBRepository;

    @Mock
    private RankingRedisRepository rankingRedisRepository;

    private RankingRedisBackfillService rankingRedisBackfillService;

    @BeforeEach
    void setUp() {
        rankingRedisBackfillService = new RankingRedisBackfillService(userPBRepository, rankingRedisRepository);
    }

    @Test
    @DisplayName("batch size가 0 이하면 1로 보정하고 모든 페이지를 끝까지 재구축한다")
    void should_rebuild_all_pages_with_safe_batch_size_when_batch_size_is_non_positive() {
        ReflectionTestUtils.setField(rankingRedisBackfillService, "batchSize", 0);
        RankingRedisEntry firstEntry = new RankingRedisEntry(1L, "Alpha", EventType.WCA_333, 9000, 11L, LocalDateTime.now());
        RankingRedisEntry secondEntry = new RankingRedisEntry(2L, "Beta", EventType.WCA_333, 9100, 12L, LocalDateTime.now());
        when(userPBRepository.findRankingRedisEntries(eq(EventType.WCA_333), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(firstEntry), PageRequest.of(0, 1), 2))
                .thenReturn(new PageImpl<>(List.of(secondEntry), PageRequest.of(1, 1), 2));

        rankingRedisBackfillService.rebuild(EventType.WCA_333);

        ArgumentCaptor<PageRequest> pageRequestCaptor = ArgumentCaptor.forClass(PageRequest.class);
        verify(userPBRepository, times(2)).findRankingRedisEntries(eq(EventType.WCA_333), pageRequestCaptor.capture());
        assertThat(pageRequestCaptor.getAllValues()).extracting(PageRequest::getPageNumber).containsExactly(0, 1);
        assertThat(pageRequestCaptor.getAllValues()).extracting(PageRequest::getPageSize).containsOnly(1);
        verify(rankingRedisRepository).clear(EventType.WCA_333);
        verify(rankingRedisRepository).upsert(firstEntry);
        verify(rankingRedisRepository).upsert(secondEntry);
        verify(rankingRedisRepository).markReady(EventType.WCA_333);
    }

    @Test
    @DisplayName("rebuildAll은 모든 종목에 대해 clear와 ready marker를 호출한다")
    void should_rebuild_all_event_types_when_rebuild_all_is_called() {
        ReflectionTestUtils.setField(rankingRedisBackfillService, "batchSize", 10);
        when(userPBRepository.findRankingRedisEntries(any(EventType.class), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 10), 0));

        rankingRedisBackfillService.rebuildAll();

        verify(rankingRedisRepository, times(EventType.values().length)).clear(any(EventType.class));
        verify(rankingRedisRepository, times(EventType.values().length)).markReady(any(EventType.class));
    }
}
