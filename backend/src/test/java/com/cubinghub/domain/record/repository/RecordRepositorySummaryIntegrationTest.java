package com.cubinghub.domain.record.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.cubinghub.domain.record.entity.EventType;
import com.cubinghub.domain.record.entity.Penalty;
import com.cubinghub.domain.record.entity.Record;
import com.cubinghub.domain.user.entity.User;
import com.cubinghub.domain.user.entity.UserRole;
import com.cubinghub.domain.user.entity.UserStatus;
import com.cubinghub.domain.user.repository.UserRepository;
import com.cubinghub.integration.JpaIntegrationTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

@DisplayName("RecordRepository summary 통합 테스트")
class RecordRepositorySummaryIntegrationTest extends JpaIntegrationTest {

    @Autowired
    private RecordRepository recordRepository;

    @Autowired
    private UserRepository userRepository;

    @Test
    @DisplayName("summary 조회는 전체 기록 수와 유효 시간 기준 PB 평균을 반환한다")
    void should_return_summary_with_total_count_and_effective_time_aggregates_when_records_exist() {
        User user = saveUser("summary@test.com", "SummaryUser");

        saveRecord(user, EventType.WCA_333, 10000, Penalty.NONE, "best");
        saveRecord(user, EventType.WCA_333, 9000, Penalty.PLUS_TWO, "plus-two");
        saveRecord(user, EventType.WCA_333, 12000, Penalty.DNF, "dnf");

        RecordSummaryQueryResult result = recordRepository.findSummaryByUserId(user.getId());

        assertThat(result.totalSolveCount()).isEqualTo(3L);
        assertThat(result.personalBestTimeMs()).isEqualTo(10000);
        assertThat(result.averageTimeMs()).isEqualTo(10500.0);
    }

    @Test
    @DisplayName("summary 조회는 모든 기록이 DNF면 PB와 평균을 null로 반환한다")
    void should_return_null_effective_aggregates_when_all_records_are_dnf() {
        User user = saveUser("summary-dnf@test.com", "SummaryDnfUser");

        saveRecord(user, EventType.WCA_333, 10000, Penalty.DNF, "dnf");

        RecordSummaryQueryResult result = recordRepository.findSummaryByUserId(user.getId());

        assertThat(result.totalSolveCount()).isEqualTo(1L);
        assertThat(result.personalBestTimeMs()).isNull();
        assertThat(result.averageTimeMs()).isNull();
    }

    @Test
    @DisplayName("summary 조회는 기록이 없으면 0건과 null 집계를 반환한다")
    void should_return_zero_count_and_null_aggregates_when_user_has_no_records() {
        User user = saveUser("summary-empty@test.com", "SummaryEmptyUser");

        RecordSummaryQueryResult result = recordRepository.findSummaryByUserId(user.getId());

        assertThat(result.totalSolveCount()).isEqualTo(0L);
        assertThat(result.personalBestTimeMs()).isNull();
        assertThat(result.averageTimeMs()).isNull();
    }

    private User saveUser(String email, String nickname) {
        return userRepository.save(User.builder()
                .email(email)
                .password("password")
                .nickname(nickname)
                .role(UserRole.ROLE_USER)
                .status(UserStatus.ACTIVE)
                .mainEvent("3x3x3")
                .build());
    }

    private Record saveRecord(User user, EventType eventType, int timeMs, Penalty penalty, String scramble) {
        return recordRepository.save(Record.builder()
                .user(user)
                .eventType(eventType)
                .timeMs(timeMs)
                .penalty(penalty)
                .scramble(scramble)
                .build());
    }
}
