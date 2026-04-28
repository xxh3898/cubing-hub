package com.cubinghub.domain.record.service;

import com.cubinghub.common.validation.InputConstraints;
import com.cubinghub.common.exception.CustomApiException;
import com.cubinghub.domain.record.dto.request.RecordPenaltyUpdateRequest;
import com.cubinghub.domain.record.dto.response.RecordPenaltyUpdateResponse;
import com.cubinghub.domain.record.dto.response.RankingPageResponse;
import com.cubinghub.domain.record.dto.response.RankingResponse;
import com.cubinghub.domain.record.dto.request.RecordSaveRequest;
import com.cubinghub.domain.record.entity.EventType;
import com.cubinghub.domain.record.entity.Penalty;
import com.cubinghub.domain.record.entity.Record;
import com.cubinghub.domain.record.entity.UserPB;
import com.cubinghub.domain.record.repository.RankingQueryResult;
import com.cubinghub.domain.record.repository.RecordRepository;
import com.cubinghub.domain.record.repository.UserPBRepository;
import com.cubinghub.domain.user.entity.User;
import com.cubinghub.domain.user.repository.UserRepository;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RecordService {

    private final RecordRepository recordRepository;
    private final UserPBRepository userPBRepository;
    private final UserRepository userRepository;
    private final RankingRedisService rankingRedisService;

    public RankingPageResponse getRankings(EventType eventType, String nickname, Integer page, Integer size) {
        return getRankings(eventType, nickname, page, size, null);
    }

    public RankingPageResponse getRankings(EventType eventType, String nickname, Integer page, Integer size, String currentUserEmail) {
        validateRankingPageRequest(page, size);
        validateRankingSearchRequest(nickname);

        boolean isRedisReady = rankingRedisService.isReady(eventType);
        RankingPageResponse rankingPage = !StringUtils.hasText(nickname) && isRedisReady
                ? rankingRedisService.getRankings(eventType, page, size)
                : getRankingsFromMySql(eventType, nickname, page, size);

        return rankingPage.withMyRanking(getMyRanking(eventType, currentUserEmail, isRedisReady));
    }

    private RankingPageResponse getRankingsFromMySql(EventType eventType, String nickname, Integer page, Integer size) {
        Page<RankingQueryResult> rankings = userPBRepository.searchRankings(
                eventType,
                nickname,
                PageRequest.of(page - 1, size)
        );
        List<RankingResponse> responses = new ArrayList<>(rankings.getNumberOfElements());

        for (RankingQueryResult ranking : rankings.getContent()) {
            responses.add(new RankingResponse(
                    ranking.getRank(),
                    ranking.getNickname(),
                    ranking.getEventType(),
                    ranking.getTimeMs()
            ));
        }

        return new RankingPageResponse(
                responses,
                page,
                size,
                rankings.getTotalElements(),
                rankings.getTotalPages(),
                rankings.hasNext(),
                rankings.hasPrevious()
        );
    }

    private RankingResponse getMyRanking(EventType eventType, String currentUserEmail, boolean isRedisReady) {
        if (!StringUtils.hasText(currentUserEmail)) {
            return null;
        }

        Optional<User> currentUser = userRepository.findByEmail(currentUserEmail);

        if (currentUser.isEmpty()) {
            return null;
        }

        Optional<RankingQueryResult> ranking = isRedisReady
                ? rankingRedisService.getRanking(eventType, currentUser.get().getId())
                : userPBRepository.findRankingByUserId(eventType, currentUser.get().getId());

        return ranking
                .map(this::toRankingResponse)
                .orElse(null);
    }

    private RankingResponse toRankingResponse(RankingQueryResult ranking) {
        return new RankingResponse(
                ranking.getRank(),
                ranking.getNickname(),
                ranking.getEventType(),
                ranking.getTimeMs()
        );
    }

    @Transactional
    public Long saveRecord(String email, RecordSaveRequest request) {
        User user = findUserByEmail(email);

        Record record = Record.builder()
                .user(user)
                .eventType(request.getEventType())
                .timeMs(request.getTimeMs())
                .penalty(request.getPenalty())
                .scramble(request.getScramble())
                .build();

        Record savedRecord = recordRepository.save(record);

        if (request.getPenalty().isRankable()) {
            PbRecalculationResult recalculationResult = recalculateUserPb(user, request.getEventType());
            syncRankingIfChanged(request.getEventType(), user.getId(), recalculationResult);
        }

        return savedRecord.getId();
    }

    @Transactional
    public RecordPenaltyUpdateResponse updateRecordPenalty(Long recordId, String email, RecordPenaltyUpdateRequest request) {
        User currentUser = findUserByEmail(email);
        Record record = findRecordById(recordId);

        validateOwnership(record, currentUser, "기록 수정 권한이 없습니다.");
        record.updatePenalty(request.getPenalty());
        PbRecalculationResult recalculationResult = recalculateUserPb(currentUser, record.getEventType());
        syncRankingIfChanged(record.getEventType(), currentUser.getId(), recalculationResult);

        return RecordPenaltyUpdateResponse.from(record);
    }

    @Transactional
    public void deleteRecord(Long recordId, String email) {
        User currentUser = findUserByEmail(email);
        Record record = findRecordById(recordId);

        validateOwnership(record, currentUser, "기록 삭제 권한이 없습니다.");

        UserPB existingPb = userPBRepository.findByUserAndEventType(currentUser, record.getEventType())
                .orElse(null);
        boolean deletingCurrentPb = existingPb != null
                && existingPb.getRecord().getId().equals(record.getId());

        if (deletingCurrentPb) {
            userPBRepository.delete(existingPb);
        }

        recordRepository.delete(record);
        recordRepository.flush();

        if (record.getPenalty().isRankable()) {
            PbRecalculationResult recalculationResult = recalculateUserPb(currentUser, record.getEventType());
            if (deletingCurrentPb && recalculationResult.userPb() == null && !recalculationResult.changed()) {
                rankingRedisService.remove(record.getEventType(), currentUser.getId());
                return;
            }
            syncRankingIfChanged(record.getEventType(), currentUser.getId(), recalculationResult);
        }
    }

    private User findUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new CustomApiException("사용자를 찾을 수 없습니다.", HttpStatus.UNAUTHORIZED));
    }

    private Record findRecordById(Long recordId) {
        return recordRepository.findById(recordId)
                .orElseThrow(() -> new CustomApiException("기록을 찾을 수 없습니다.", HttpStatus.NOT_FOUND));
    }

    private void validateOwnership(Record record, User currentUser, String message) {
        if (!record.getUser().getId().equals(currentUser.getId())) {
            throw new CustomApiException(message, HttpStatus.FORBIDDEN);
        }
    }

    private PbRecalculationResult recalculateUserPb(User user, EventType eventType) {
        Record bestRecord = recordRepository.findBestRecordByUserIdAndEventType(user.getId(), eventType)
                .orElse(null);
        UserPB existingPb = userPBRepository.findByUserAndEventType(user, eventType)
                .orElse(null);

        if (bestRecord == null) {
            if (existingPb != null) {
                userPBRepository.delete(existingPb);
                return PbRecalculationResult.changed(null);
            }
            return PbRecalculationResult.unchanged(null);
        }

        Integer bestTimeMs = bestRecord.getEffectiveTimeMs();

        if (existingPb == null) {
            UserPB newPB = UserPB.builder()
                    .user(user)
                    .eventType(eventType)
                    .bestTimeMs(bestTimeMs)
                    .record(bestRecord)
                    .build();
            userPBRepository.save(newPB);
            return PbRecalculationResult.changed(newPB);
        }

        if (isSamePb(existingPb, bestRecord, bestTimeMs)) {
            return PbRecalculationResult.unchanged(existingPb);
        }

        existingPb.updateBestTime(bestTimeMs, bestRecord);
        return PbRecalculationResult.changed(existingPb);
    }

    private boolean isSamePb(UserPB existingPb, Record bestRecord, Integer bestTimeMs) {
        return existingPb.getBestTimeMs().equals(bestTimeMs)
                && existingPb.getRecord().getId().equals(bestRecord.getId());
    }

    private void validateRankingPageRequest(Integer page, Integer size) {
        if (page < 1) {
            throw new IllegalArgumentException("잘못된 페이지 번호입니다.");
        }
        if (size < 1 || size > 100) {
            throw new IllegalArgumentException("한 번에 조회할 수 있는 개수는 1개 이상 100개 이하여야 합니다.");
        }
    }

    private void validateRankingSearchRequest(String nickname) {
        if (!StringUtils.hasText(nickname)) {
            return;
        }

        if (nickname.trim().length() > InputConstraints.RANKING_NICKNAME_SEARCH_MAX_LENGTH) {
            throw new IllegalArgumentException("닉네임 검색어는 50자 이하여야 합니다.");
        }
    }

    private void syncRankingIfChanged(EventType eventType, Long userId, PbRecalculationResult recalculationResult) {
        if (!recalculationResult.changed()) {
            return;
        }

        if (recalculationResult.userPb() == null) {
            rankingRedisService.remove(eventType, userId);
            return;
        }

        rankingRedisService.sync(recalculationResult.userPb());
    }

    private record PbRecalculationResult(UserPB userPb, boolean changed) {

        private static PbRecalculationResult changed(UserPB userPb) {
            return new PbRecalculationResult(userPb, true);
        }

        private static PbRecalculationResult unchanged(UserPB userPb) {
            return new PbRecalculationResult(userPb, false);
        }
    }
}
