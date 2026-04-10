package com.cubinghub.domain.record.service;

import com.cubinghub.common.exception.CustomApiException;
import com.cubinghub.domain.record.dto.RankingQueryResult;
import com.cubinghub.domain.record.dto.RankingResponse;
import com.cubinghub.domain.record.dto.RecordSaveRequest;
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
            responses.add(new RankingResponse(i + 1, ranking.getNickname(), ranking.getEventType(), ranking.getTimeMs()));
        }

        return responses;
    }

    @Transactional
    public Long saveRecord(String email, RecordSaveRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new CustomApiException("사용자를 찾을 수 없습니다.", HttpStatus.NOT_FOUND));

        Record record = Record.builder()
                .user(user)
                .eventType(request.getEventType())
                .timeMs(request.getTimeMs())
                .penalty(request.getPenalty())
                .scramble(request.getScramble())
                .build();

        Record savedRecord = recordRepository.save(record);

        if (request.getPenalty() != Penalty.DNF) {
            updateUserPB(user, savedRecord);
        }

        return savedRecord.getId();
    }

    private void updateUserPB(User user, Record record) {
        userPBRepository.findByUserAndEventType(user, record.getEventType())
                .ifPresentOrElse(
                        pb -> {
                            if (record.getTimeMs() < pb.getBestTimeMs()) {
                                pb.updateBestTime(record.getTimeMs(), record);
                            }
                        },
                        () -> userPBRepository.save(
                                UserPB.builder()
                                        .user(user)
                                        .eventType(record.getEventType())
                                        .bestTimeMs(record.getTimeMs())
                                        .record(record)
                                        .build()
                        )
                );
    }
}
