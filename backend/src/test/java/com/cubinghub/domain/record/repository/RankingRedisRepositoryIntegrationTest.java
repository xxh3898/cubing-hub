package com.cubinghub.domain.record.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.cubinghub.domain.record.dto.internal.RankingRedisEntry;
import com.cubinghub.domain.record.entity.EventType;
import com.cubinghub.integration.RedisIntegrationTest;
import java.time.Instant;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

@DisplayName("RankingRedisRepository 통합 테스트")
class RankingRedisRepositoryIntegrationTest extends RedisIntegrationTest {

    @Autowired
    private RankingRedisRepository rankingRedisRepository;

    @AfterEach
    void tearDown() {
        deleteKeysByPattern("ranking:v2:*");
    }

    @Test
    @DisplayName("Redis 랭킹 조회는 같은 시간일 때 createdAt과 recordId 기준으로 정렬한다")
    void should_return_rankings_sorted_by_created_at_and_record_id_when_scores_are_equal() {
        Instant baseTime = Instant.parse("2026-04-21T10:00:00Z");

        rankingRedisRepository.upsert(new RankingRedisEntry(1L, "First", EventType.WCA_333, 10000, 1L, baseTime));
        rankingRedisRepository.upsert(new RankingRedisEntry(2L, "Second", EventType.WCA_333, 10000, 3L, baseTime));
        rankingRedisRepository.upsert(new RankingRedisEntry(3L, "Third", EventType.WCA_333, 10000, 2L, baseTime));
        rankingRedisRepository.markReady(EventType.WCA_333);

        Page<RankingRedisEntry> rankings = rankingRedisRepository.readPage(EventType.WCA_333, PageRequest.of(0, 25));

        assertThat(rankings.getContent()).extracting(RankingRedisEntry::getNickname)
                .containsExactly("First", "Third", "Second");
    }

    @Test
    @DisplayName("Redis 랭킹 조회는 페이지와 전체 개수를 함께 반환한다")
    void should_return_paginated_rankings_with_total_count() {
        Instant baseTime = Instant.parse("2026-04-21T10:00:00Z");

        for (int i = 0; i < 5; i++) {
            rankingRedisRepository.upsert(new RankingRedisEntry(
                    (long) i + 1,
                    "User" + i,
                    EventType.WCA_333,
                    9000 + i,
                    (long) i + 1,
                    baseTime.plusSeconds(i)
            ));
        }
        rankingRedisRepository.markReady(EventType.WCA_333);

        Page<RankingRedisEntry> rankings = rankingRedisRepository.readPage(EventType.WCA_333, PageRequest.of(1, 2));

        assertThat(rankings.getContent()).extracting(RankingRedisEntry::getNickname)
                .containsExactly("User2", "User3");
        assertThat(rankings.getTotalElements()).isEqualTo(5);
        assertThat(rankings.getTotalPages()).isEqualTo(3);
        assertThat(rankings.hasNext()).isTrue();
        assertThat(rankings.hasPrevious()).isTrue();
    }

    @Test
    @DisplayName("Redis 랭킹 엔트리를 삭제하면 조회 결과와 개수에서 함께 제거된다")
    void should_remove_ranking_entry_when_user_pb_is_deleted() {
        Instant baseTime = Instant.parse("2026-04-21T10:00:00Z");

        rankingRedisRepository.upsert(new RankingRedisEntry(1L, "Alpha", EventType.WCA_333, 9000, 1L, baseTime));
        rankingRedisRepository.upsert(new RankingRedisEntry(2L, "Beta", EventType.WCA_333, 9100, 2L, baseTime.plusSeconds(1)));
        rankingRedisRepository.markReady(EventType.WCA_333);

        rankingRedisRepository.remove(EventType.WCA_333, 1L);

        Page<RankingRedisEntry> rankings = rankingRedisRepository.readPage(EventType.WCA_333, PageRequest.of(0, 25));

        assertThat(rankings.getContent()).extracting(RankingRedisEntry::getNickname)
                .containsExactly("Beta");
        assertThat(rankings.getTotalElements()).isEqualTo(1);
    }
}
