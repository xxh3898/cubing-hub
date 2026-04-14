package com.cubinghub.domain.record;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.cubinghub.domain.record.entity.EventType;
import com.cubinghub.domain.record.entity.Penalty;
import com.cubinghub.domain.record.entity.Record;
import com.cubinghub.domain.record.repository.RecordRepository;
import com.cubinghub.domain.user.entity.User;
import com.cubinghub.domain.user.entity.UserRole;
import com.cubinghub.domain.user.entity.UserStatus;
import com.cubinghub.domain.user.repository.UserRepository;
import com.cubinghub.integration.JpaIntegrationTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc
@DisplayName("RankingController 통합 테스트")
class RankingControllerIntegrationTest extends JpaIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RecordRepository recordRepository;

    @Test
    @DisplayName("101건 이상의 기록이 있어도 랭킹 응답은 상위 100건만 반환한다")
    void should_limit_rankings_to_top_100_when_more_than_100_records_exist() throws Exception {
        for (int i = 0; i < 101; i++) {
            User user = userRepository.save(User.builder()
                    .email("ranker" + i + "@cubinghub.com")
                    .password("password")
                    .nickname("Ranker" + i)
                    .role(UserRole.ROLE_USER)
                    .status(UserStatus.ACTIVE)
                    .build());
            recordRepository.save(Record.builder()
                    .user(user)
                    .eventType(EventType.WCA_333)
                    .timeMs(10000 + i)
                    .penalty(Penalty.NONE)
                    .scramble("scramble-" + i)
                    .build());
        }

        mockMvc.perform(get("/api/rankings")
                        .param("eventType", EventType.WCA_333.name())
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(100))
                .andExpect(jsonPath("$.data[0].rank").value(1))
                .andExpect(jsonPath("$.data[99].rank").value(100))
                .andExpect(jsonPath("$.data[99].nickname").value("Ranker99"))
                .andExpect(jsonPath("$.data[99].timeMs").value(10099));
    }

    @Test
    @DisplayName("랭킹 조회는 PLUS_TWO 페널티를 반영한 시간을 반환한다")
    void should_return_effective_time_when_plus_two_penalty_exists() throws Exception {
        User alpha = userRepository.save(User.builder()
                .email("alpha@cubinghub.com")
                .password("password")
                .nickname("Alpha")
                .role(UserRole.ROLE_USER)
                .status(UserStatus.ACTIVE)
                .build());
        User beta = userRepository.save(User.builder()
                .email("beta@cubinghub.com")
                .password("password")
                .nickname("Beta")
                .role(UserRole.ROLE_USER)
                .status(UserStatus.ACTIVE)
                .build());

        recordRepository.save(Record.builder()
                .user(alpha)
                .eventType(EventType.WCA_333)
                .timeMs(10000)
                .penalty(Penalty.PLUS_TWO)
                .scramble("alpha")
                .build());
        recordRepository.save(Record.builder()
                .user(beta)
                .eventType(EventType.WCA_333)
                .timeMs(11000)
                .penalty(Penalty.NONE)
                .scramble("beta")
                .build());

        mockMvc.perform(get("/api/rankings")
                        .param("eventType", EventType.WCA_333.name())
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].nickname").value("Beta"))
                .andExpect(jsonPath("$.data[0].timeMs").value(11000))
                .andExpect(jsonPath("$.data[1].nickname").value("Alpha"))
                .andExpect(jsonPath("$.data[1].timeMs").value(12000));
    }
}
