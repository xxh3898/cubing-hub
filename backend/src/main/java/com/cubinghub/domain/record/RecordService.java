package com.cubinghub.domain.record;

import com.cubinghub.domain.record.dto.RankingQueryResult;
import com.cubinghub.domain.record.dto.RankingResponse;
import com.cubinghub.domain.record.dto.RecordSaveRequest;
import com.cubinghub.domain.user.User;
import com.cubinghub.domain.user.UserRepository;
import lombok.RequiredArgsConstructor;
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
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + email));

        Record record = Record.builder()
                .user(user)
                .eventType(request.getEventType())
                .timeMs(request.getTimeMs())
                .penalty(request.getPenalty())
                .scramble(request.getScramble())
                .build();

        Record savedRecord = recordRepository.save(record);

        // PB 갱신 로직 (DNF가 아닌 경우에만)
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
                        () -> {
                            UserPB newPB = UserPB.builder()
                                    .user(user)
                                    .eventType(record.getEventType())
                                    .bestTimeMs(record.getTimeMs())
                                    .record(record)
                                    .build();
                            userPBRepository.save(newPB);
                        }
                );
    }
}
