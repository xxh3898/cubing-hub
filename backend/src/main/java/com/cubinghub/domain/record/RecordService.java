package com.cubinghub.domain.record;

import com.cubinghub.domain.record.dto.RecordSaveRequest;
import com.cubinghub.domain.user.User;
import com.cubinghub.domain.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RecordService {

    private final RecordRepository recordRepository;
    private final UserPBRepository userPBRepository;
    private final UserRepository userRepository;

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
