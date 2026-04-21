package com.cubinghub.domain.record.repository;

import com.cubinghub.domain.record.dto.internal.RankingRedisEntry;
import com.cubinghub.domain.record.entity.EventType;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ZSetOperations;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class RankingRedisRepository {

    private static final String KEY_PREFIX = "ranking:v2:";
    private static final String READY_KEY_SUFFIX = ":ready";
    private static final String ZSET_KEY_SUFFIX = ":zset";
    private static final String NICKNAME_KEY_SUFFIX = ":nicknames";
    private static final String MEMBER_KEY_SUFFIX = ":members";
    private static final String MEMBER_FORMAT = "%013d:%019d:%019d";

    private final StringRedisTemplate redisTemplate;

    public boolean isReady(EventType eventType) {
        return Boolean.TRUE.equals(redisTemplate.hasKey(readyKey(eventType)));
    }

    public void clear(EventType eventType) {
        redisTemplate.delete(List.of(
                readyKey(eventType),
                zsetKey(eventType),
                nicknameKey(eventType),
                memberKey(eventType)
        ));
    }

    public void markReady(EventType eventType) {
        redisTemplate.opsForValue().set(readyKey(eventType), "true");
    }

    public void upsert(RankingRedisEntry entry) {
        String userId = entry.getUserId().toString();
        String nextMember = serializeMember(entry);
        String previousMember = (String) redisTemplate.opsForHash().get(memberKey(entry.getEventType()), userId);

        if (previousMember != null && !previousMember.equals(nextMember)) {
            redisTemplate.opsForZSet().remove(zsetKey(entry.getEventType()), previousMember);
        }

        redisTemplate.opsForZSet().add(zsetKey(entry.getEventType()), nextMember, entry.getTimeMs());
        redisTemplate.opsForHash().put(memberKey(entry.getEventType()), userId, nextMember);
        redisTemplate.opsForHash().put(nicknameKey(entry.getEventType()), userId, entry.getNickname());
    }

    public void remove(EventType eventType, Long userId) {
        String userIdValue = userId.toString();
        String previousMember = (String) redisTemplate.opsForHash().get(memberKey(eventType), userIdValue);

        if (previousMember != null) {
            redisTemplate.opsForZSet().remove(zsetKey(eventType), previousMember);
        }

        redisTemplate.opsForHash().delete(memberKey(eventType), userIdValue);
        redisTemplate.opsForHash().delete(nicknameKey(eventType), userIdValue);
    }

    public Page<RankingRedisEntry> readPage(EventType eventType, Pageable pageable) {
        long total = totalCount(eventType);

        if (total == 0) {
            return new PageImpl<>(Collections.emptyList(), pageable, 0);
        }

        long start = pageable.getOffset();
        long end = start + pageable.getPageSize() - 1;
        Set<ZSetOperations.TypedTuple<String>> tuples = redisTemplate.opsForZSet()
                .rangeWithScores(zsetKey(eventType), start, end);

        if (tuples == null || tuples.isEmpty()) {
            return new PageImpl<>(Collections.emptyList(), pageable, total);
        }

        List<String> userIds = new ArrayList<>(tuples.size());
        List<ZSetOperations.TypedTuple<String>> orderedTuples = new ArrayList<>(tuples);

        for (ZSetOperations.TypedTuple<String> tuple : orderedTuples) {
            userIds.add(parseUserId(tuple.getValue()).toString());
        }

        List<Object> nicknameValues = redisTemplate.opsForHash().multiGet(nicknameKey(eventType), new ArrayList<>(userIds));
        List<RankingRedisEntry> items = new ArrayList<>(orderedTuples.size());

        for (int i = 0; i < orderedTuples.size(); i++) {
            ZSetOperations.TypedTuple<String> tuple = orderedTuples.get(i);
            Double score = tuple.getScore();
            String nickname = nicknameValues != null && nicknameValues.size() > i && nicknameValues.get(i) != null
                    ? nicknameValues.get(i).toString()
                    : "";
            items.add(RankingRedisEntry.forRead(
                    parseUserId(tuple.getValue()),
                    nickname,
                    eventType,
                    score == null ? 0 : score.intValue()
            ));
        }

        return new PageImpl<>(items, pageable, total);
    }

    public long totalCount(EventType eventType) {
        Long total = redisTemplate.opsForZSet().zCard(zsetKey(eventType));
        return total == null ? 0L : total;
    }

    private String serializeMember(RankingRedisEntry entry) {
        return MEMBER_FORMAT.formatted(
                toEpochMilli(entry.getRecordCreatedAt()),
                entry.getRecordId(),
                entry.getUserId()
        );
    }

    private long toEpochMilli(LocalDateTime createdAt) {
        return createdAt.toInstant(ZoneOffset.UTC).toEpochMilli();
    }

    private Long parseUserId(String member) {
        int lastSeparatorIndex = member.lastIndexOf(':');
        return Long.parseLong(member.substring(lastSeparatorIndex + 1));
    }

    private String readyKey(EventType eventType) {
        return baseKey(eventType) + READY_KEY_SUFFIX;
    }

    private String zsetKey(EventType eventType) {
        return baseKey(eventType) + ZSET_KEY_SUFFIX;
    }

    private String nicknameKey(EventType eventType) {
        return baseKey(eventType) + NICKNAME_KEY_SUFFIX;
    }

    private String memberKey(EventType eventType) {
        return baseKey(eventType) + MEMBER_KEY_SUFFIX;
    }

    private String baseKey(EventType eventType) {
        return KEY_PREFIX + eventType.name();
    }
}
