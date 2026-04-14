package com.cubinghub.domain.record.service;

import com.cubinghub.common.exception.CustomApiException;
import com.cubinghub.domain.record.dto.request.RecordPenaltyUpdateRequest;
import com.cubinghub.domain.record.repository.RankingQueryResult;
import com.cubinghub.domain.record.dto.response.RecordPenaltyUpdateResponse;
import com.cubinghub.domain.record.dto.response.RankingResponse;
import com.cubinghub.domain.record.dto.request.RecordSaveRequest;
import com.cubinghub.domain.record.entity.EventType;
import com.cubinghub.domain.record.entity.Penalty;
import com.cubinghub.domain.record.entity.Record;
import com.cubinghub.domain.record.entity.UserPB;
import com.cubinghub.domain.record.repository.RecordRepository;
import com.cubinghub.domain.record.repository.UserPBRepository;
import com.cubinghub.domain.user.entity.User;
import com.cubinghub.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RecordService {

    private final RecordRepository recordRepository;
    private final UserPBRepository userPBRepository;
    private final UserRepository userRepository;

    public List<RankingResponse> getRankings(EventType eventType) {
        List<RankingQueryResult> rankings = recordRepository.findTop100RankingsByEventType(eventType);
        List<RankingResponse> responses = new ArrayList<>(rankings.size());

        for (int i = 0; i < rankings.size(); i++) {
            RankingQueryResult ranking = rankings.get(i);
            responses.add(new RankingResponse(
                    i + 1,
                    ranking.getNickname(),
                    ranking.getEventType(),
                    ranking.getTimeMs()
            ));
        }

        return responses;
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

        validateOwnership(record, currentUser);
        record.updatePenalty(request.getPenalty());
        recalculateUserPb(currentUser, record.getEventType());

        return RecordPenaltyUpdateResponse.from(record);
    }

    private User findUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + email));
    }

    private Record findRecordById(Long recordId) {
        return recordRepository.findById(recordId)
                .orElseThrow(() -> new CustomApiException("기록을 찾을 수 없습니다.", HttpStatus.NOT_FOUND));
    }

    private void validateOwnership(Record record, User currentUser) {
        if (!record.getUser().getId().equals(currentUser.getId())) {
            throw new CustomApiException("기록 수정 권한이 없습니다.", HttpStatus.FORBIDDEN);
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
}
