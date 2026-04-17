package com.cubinghub.domain.record.service;

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
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RecordService {

    private final RecordRepository recordRepository;
    private final UserPBRepository userPBRepository;
    private final UserRepository userRepository;

    public RankingPageResponse getRankings(EventType eventType, String nickname, Integer page, Integer size) {
        validateRankingPageRequest(page, size);

        Page<RankingQueryResult> rankings = userPBRepository.searchRankings(
                eventType,
                nickname,
                PageRequest.of(page - 1, size)
        );
        List<RankingResponse> responses = new ArrayList<>(rankings.getNumberOfElements());
        int startRank = (page - 1) * size;

        for (int i = 0; i < rankings.getContent().size(); i++) {
            RankingQueryResult ranking = rankings.getContent().get(i);
            responses.add(new RankingResponse(
                    startRank + i + 1,
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
            recalculateUserPb(user, request.getEventType());
        }

        return savedRecord.getId();
    }

    @Transactional
    public RecordPenaltyUpdateResponse updateRecordPenalty(Long recordId, String email, RecordPenaltyUpdateRequest request) {
        User currentUser = findUserByEmail(email);
        Record record = findRecordById(recordId);

        validateOwnership(record, currentUser, "기록 수정 권한이 없습니다.");
        record.updatePenalty(request.getPenalty());
        recalculateUserPb(currentUser, record.getEventType());

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
            recalculateUserPb(currentUser, record.getEventType());
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

    private void recalculateUserPb(User user, EventType eventType) {
        Record bestRecord = recordRepository.findBestRecordByUserIdAndEventType(user.getId(), eventType)
                .orElse(null);
        UserPB existingPb = userPBRepository.findByUserAndEventType(user, eventType)
                .orElse(null);

        if (bestRecord == null) {
            if (existingPb != null) {
                userPBRepository.delete(existingPb);
            }
            return;
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
            return;
        }

        if (isSamePb(existingPb, bestRecord, bestTimeMs)) {
            return;
        }

        existingPb.updateBestTime(bestTimeMs, bestRecord);
    }

    private boolean isSamePb(UserPB existingPb, Record bestRecord, Integer bestTimeMs) {
        return existingPb.getBestTimeMs().equals(bestTimeMs)
                && existingPb.getRecord().getId().equals(bestRecord.getId());
    }

    private void validateRankingPageRequest(Integer page, Integer size) {
        if (page < 1) {
            throw new IllegalArgumentException("page는 1 이상이어야 합니다.");
        }
        if (size < 1 || size > 100) {
            throw new IllegalArgumentException("size는 1 이상 100 이하여야 합니다.");
        }
    }
}
