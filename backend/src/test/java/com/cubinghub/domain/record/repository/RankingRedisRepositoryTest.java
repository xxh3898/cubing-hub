package com.cubinghub.domain.record.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.cubinghub.domain.record.dto.internal.RankingRedisEntry;
import com.cubinghub.domain.record.entity.EventType;
import java.time.Instant;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.redis.core.DefaultTypedTuple;
import org.springframework.data.redis.core.HashOperations;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.data.redis.core.ZSetOperations;

@ExtendWith(MockitoExtension.class)
@DisplayName("RankingRedisRepository 단위 테스트")
class RankingRedisRepositoryTest {

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    @Mock
    private HashOperations<String, Object, Object> hashOperations;

    @Mock
    private ZSetOperations<String, String> zSetOperations;

    private RankingRedisRepository rankingRedisRepository;

    @BeforeEach
    void setUp() {
        rankingRedisRepository = new RankingRedisRepository(redisTemplate);
        lenient().when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        lenient().when(redisTemplate.opsForHash()).thenReturn(hashOperations);
        lenient().when(redisTemplate.opsForZSet()).thenReturn(zSetOperations);
    }

    @Test
    @DisplayName("ready key 조회 결과가 null이면 준비되지 않은 상태로 본다")
    void should_return_false_when_ready_key_lookup_returns_null() {
        when(redisTemplate.hasKey(anyString())).thenReturn(null);

        assertThat(rankingRedisRepository.isReady(EventType.WCA_333)).isFalse();
    }

    @Test
    @DisplayName("ready key가 false면 준비되지 않은 상태로 본다")
    void should_return_false_when_ready_key_lookup_returns_false() {
        when(redisTemplate.hasKey(anyString())).thenReturn(false);

        assertThat(rankingRedisRepository.isReady(EventType.WCA_333)).isFalse();
    }

    @Test
    @DisplayName("이전 member가 바뀌면 기존 zset member를 제거하고 새 값으로 upsert한다")
    void should_replace_previous_member_when_existing_member_changes() {
        RankingRedisEntry entry = new RankingRedisEntry(
                3L,
                "CubeUser",
                EventType.WCA_333,
                9123,
                44L,
                Instant.parse("2026-04-24T13:00:00Z")
        );
        when(hashOperations.get(anyString(), anyString())).thenReturn("old-member");

        rankingRedisRepository.upsert(entry);

        verify(zSetOperations).remove(anyString(), anyString());
        verify(zSetOperations).add(anyString(), anyString(), anyDouble());
        verify(hashOperations, times(2)).put(anyString(), anyString(), anyString());
    }

    @Test
    @DisplayName("이전 member가 같으면 기존 zset member를 제거하지 않는다")
    void should_not_remove_member_when_existing_member_is_unchanged() {
        RankingRedisEntry entry = new RankingRedisEntry(
                3L,
                "CubeUser",
                EventType.WCA_333,
                9123,
                44L,
                Instant.parse("2026-04-24T13:00:00Z")
        );
        String currentMember = "%013d:%019d:%019d".formatted(
                entry.getRecordCreatedAt().toEpochMilli(),
                entry.getRecordId(),
                entry.getUserId()
        );
        when(hashOperations.get(anyString(), anyString())).thenReturn(currentMember);

        rankingRedisRepository.upsert(entry);

        verify(zSetOperations, never()).remove(anyString(), anyString());
    }

    @Test
    @DisplayName("zCard 결과가 null이면 전체 개수는 0으로 반환한다")
    void should_return_zero_when_zset_cardinality_is_null() {
        when(zSetOperations.zCard(anyString())).thenReturn(null);

        assertThat(rankingRedisRepository.totalCount(EventType.WCA_333)).isZero();
    }

    @Test
    @DisplayName("range 조회 결과가 null이면 빈 페이지를 반환한다")
    void should_return_empty_page_when_range_query_returns_null() {
        when(zSetOperations.zCard(anyString())).thenReturn(1L);
        when(zSetOperations.rangeWithScores(anyString(), anyLong(), anyLong())).thenReturn(null);

        Page<RankingRedisEntry> page = rankingRedisRepository.readPage(EventType.WCA_333, PageRequest.of(0, 10));

        assertThat(page.getContent()).isEmpty();
        assertThat(page.getTotalElements()).isEqualTo(1L);
    }

    @Test
    @DisplayName("range 조회 결과가 빈 Set이면 빈 페이지를 반환한다")
    void should_return_empty_page_when_range_query_returns_empty_set() {
        when(zSetOperations.zCard(anyString())).thenReturn(1L);
        when(zSetOperations.rangeWithScores(anyString(), anyLong(), anyLong())).thenReturn(Set.of());

        Page<RankingRedisEntry> page = rankingRedisRepository.readPage(EventType.WCA_333, PageRequest.of(0, 10));

        assertThat(page.getContent()).isEmpty();
        assertThat(page.getTotalElements()).isEqualTo(1L);
    }

    @Test
    @DisplayName("nickname 또는 score가 없으면 빈 닉네임과 0 기록으로 매핑한다")
    void should_map_missing_nickname_and_score_to_defaults_when_rank_entry_metadata_is_missing() {
        Set<ZSetOperations.TypedTuple<String>> tuples = new LinkedHashSet<>();
        tuples.add(new DefaultTypedTuple<>("0000000000000:0000000000000000001:0000000000000000002", null));
        when(zSetOperations.zCard(anyString())).thenReturn(1L);
        when(zSetOperations.rangeWithScores(anyString(), anyLong(), anyLong())).thenReturn(tuples);
        when(hashOperations.multiGet(anyString(), anyList())).thenReturn(null);

        Page<RankingRedisEntry> page = rankingRedisRepository.readPage(EventType.WCA_333, PageRequest.of(0, 10));

        assertThat(page.getContent()).hasSize(1);
        assertThat(page.getContent().get(0).getUserId()).isEqualTo(2L);
        assertThat(page.getContent().get(0).getNickname()).isEmpty();
        assertThat(page.getContent().get(0).getTimeMs()).isZero();
    }

    @Test
    @DisplayName("nickname 목록에 null이 있으면 빈 닉네임으로 매핑한다")
    void should_map_null_nickname_value_to_empty_string_when_nickname_list_contains_null() {
        Set<ZSetOperations.TypedTuple<String>> tuples = new LinkedHashSet<>();
        tuples.add(new DefaultTypedTuple<>("0000000000000:0000000000000000001:0000000000000000002", 1234.0));
        when(zSetOperations.zCard(anyString())).thenReturn(1L);
        when(zSetOperations.rangeWithScores(anyString(), anyLong(), anyLong())).thenReturn(tuples);
        when(hashOperations.multiGet(anyString(), anyList())).thenReturn(Arrays.asList((Object) null));

        Page<RankingRedisEntry> page = rankingRedisRepository.readPage(EventType.WCA_333, PageRequest.of(0, 10));

        assertThat(page.getContent()).hasSize(1);
        assertThat(page.getContent().get(0).getNickname()).isEmpty();
        assertThat(page.getContent().get(0).getTimeMs()).isEqualTo(1234);
    }

    @Test
    @DisplayName("nickname 목록이 tuple 개수보다 짧으면 없는 값은 빈 닉네임으로 매핑한다")
    void should_map_missing_tail_nickname_to_empty_string_when_nickname_list_is_shorter_than_tuples() {
        Set<ZSetOperations.TypedTuple<String>> tuples = new LinkedHashSet<>();
        tuples.add(new DefaultTypedTuple<>("0000000000000:0000000000000000001:0000000000000000002", 1234.0));
        tuples.add(new DefaultTypedTuple<>("0000000000000:0000000000000000001:0000000000000000003", 2345.0));
        when(zSetOperations.zCard(anyString())).thenReturn(2L);
        when(zSetOperations.rangeWithScores(anyString(), anyLong(), anyLong())).thenReturn(tuples);
        when(hashOperations.multiGet(anyString(), anyList())).thenReturn(List.of("Alpha"));

        Page<RankingRedisEntry> page = rankingRedisRepository.readPage(EventType.WCA_333, PageRequest.of(0, 10));

        assertThat(page.getContent()).hasSize(2);
        assertThat(page.getContent().get(0).getNickname()).isEqualTo("Alpha");
        assertThat(page.getContent().get(1).getNickname()).isEmpty();
        assertThat(page.getContent().get(1).getTimeMs()).isEqualTo(2345);
    }

    @Test
    @DisplayName("사용자 ID 기준 Redis 랭킹 조회는 rank와 score를 응답한다")
    void should_return_ranking_by_user_id_when_member_exists() {
        String member = "0000000000000:0000000000000000044:0000000000000000002";
        when(hashOperations.get(anyString(), anyString())).thenReturn(member, "Alpha");
        when(zSetOperations.rank(anyString(), anyString())).thenReturn(2L);
        when(zSetOperations.score(anyString(), anyString())).thenReturn(9344.0);

        RankingQueryResult result = rankingRedisRepository.findRankingByUserId(EventType.WCA_333, 2L).orElseThrow();

        assertThat(result.getRank()).isEqualTo(3);
        assertThat(result.getNickname()).isEqualTo("Alpha");
        assertThat(result.getEventType()).isEqualTo(EventType.WCA_333);
        assertThat(result.getTimeMs()).isEqualTo(9344);
    }

    @Test
    @DisplayName("사용자 ID 기준 Redis member가 없으면 빈 결과를 반환한다")
    void should_return_empty_ranking_by_user_id_when_member_is_missing() {
        when(hashOperations.get(anyString(), anyString())).thenReturn(null);

        assertThat(rankingRedisRepository.findRankingByUserId(EventType.WCA_333, 2L)).isEmpty();
        verify(zSetOperations, never()).rank(anyString(), anyString());
    }
}
