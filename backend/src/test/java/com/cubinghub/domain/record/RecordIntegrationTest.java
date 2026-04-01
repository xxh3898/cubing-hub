package com.cubinghub.domain.record;

import com.cubinghub.domain.record.dto.RecordSaveRequest;
import com.cubinghub.domain.user.User;
import com.cubinghub.domain.user.UserRepository;
import com.cubinghub.domain.user.UserRole;
import com.cubinghub.domain.user.UserStatus;
import com.cubinghub.integration.RestDocsBaseTest;
import com.cubinghub.security.JwtTokenProvider;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.test.web.servlet.ResultActions;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.restdocs.mockmvc.MockMvcRestDocumentation.document;
import static org.springframework.restdocs.mockmvc.RestDocumentationRequestBuilders.get;
import static org.springframework.restdocs.mockmvc.RestDocumentationRequestBuilders.post;
import static org.springframework.restdocs.payload.PayloadDocumentation.responseFields;
import static org.springframework.restdocs.payload.PayloadDocumentation.fieldWithPath;
import static org.springframework.restdocs.payload.PayloadDocumentation.requestFields;
import static org.springframework.restdocs.request.RequestDocumentation.parameterWithName;
import static org.springframework.restdocs.request.RequestDocumentation.queryParameters;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class RecordIntegrationTest extends RestDocsBaseTest {

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RecordRepository recordRepository;

    @Autowired
    private UserPBRepository userPBRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    private User testUser;
    private String accessToken;

    @BeforeEach
    void setUp() {
        testUser = userRepository.save(User.builder()
                .email("tester@cubinghub.com")
                .password("password")
                .nickname("Tester")
                .role(UserRole.ROLE_USER)
                .status(UserStatus.ACTIVE)
                .build());

        UserDetails userDetails = org.springframework.security.core.userdetails.User.builder()
                .username(testUser.getEmail())
                .password("")
                .authorities(Collections.singletonList(() -> UserRole.ROLE_USER.name()))
                .build();

        accessToken = jwtTokenProvider.generateAccessToken(userDetails);
    }

    @Test
    @DisplayName("새로운 기록을 저장하고 성공 시 201 Created를 반환한다")
    void saveRecord() throws Exception {
        // given
        RecordSaveRequest request = RecordSaveRequest.builder()
                .eventType(EventType.WCA_333)
                .timeMs(12500)
                .penalty(Penalty.NONE)
                .scramble("R U R' U' R F R2 U' R' U' R U R' F'")
                .build();

        // when
        ResultActions result = mockMvc.perform(post("/api/records")
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)));

        // then
        result.andExpect(status().isCreated())
                .andDo(document("record/create",
                        requestFields(
                                fieldWithPath("eventType").description("WCA 종목 코드 (e.g. WCA_333)"),
                                fieldWithPath("timeMs").description("측정 시간 (밀리초)"),
                                fieldWithPath("penalty").description("페널티 정보 (NONE, PLUS_TWO, DNF)"),
                                fieldWithPath("scramble").description("해당 측정에 사용된 스크램블 문자열")
                        )
                ));

        assertThat(recordRepository.findAll()).hasSize(1);
        Record savedRecord = recordRepository.findAll().get(0);
        assertThat(savedRecord.getTimeMs()).isEqualTo(12500);
        assertThat(savedRecord.getUser().getId()).isEqualTo(testUser.getId());

        // PB 확인
        UserPB pb = userPBRepository.findByUserAndEventType(testUser, EventType.WCA_333).orElseThrow();
        assertThat(pb.getBestTimeMs()).isEqualTo(12500);
    }

    @Test
    @DisplayName("더 빠른 기록이 들어오면 PB가 자동으로 갱신된다")
    void updatePB() throws Exception {
        // given: 첫 번째 기록 저장
        recordRepository.save(Record.builder()
                .user(testUser)
                .eventType(EventType.WCA_333)
                .timeMs(15000)
                .penalty(Penalty.NONE)
                .scramble("scramble1")
                .build());
        userPBRepository.save(UserPB.builder()
                .user(testUser)
                .eventType(EventType.WCA_333)
                .bestTimeMs(15000)
                .record(recordRepository.findAll().get(0))
                .build());

        // when: 더 빠른 기록(10초) 저장 요청
        RecordSaveRequest betterRequest = RecordSaveRequest.builder()
                .eventType(EventType.WCA_333)
                .timeMs(10000)
                .penalty(Penalty.NONE)
                .scramble("better scramble")
                .build();

        mockMvc.perform(post("/api/records")
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(betterRequest)))
                .andExpect(status().isCreated());

        // then: PB가 10초로 갱신되었는지 확인
        UserPB pb = userPBRepository.findByUserAndEventType(testUser, EventType.WCA_333).orElseThrow();
        assertThat(pb.getBestTimeMs()).isEqualTo(10000);
    }

    @Test
    @DisplayName("글로벌 랭킹은 DNF를 제외하고 같은 종목 기록을 빠른 순서로 최대 100건 반환한다")
    void getRankings() throws Exception {
        User alpha = saveUser("alpha@cubinghub.com", "Alpha");
        User beta = saveUser("beta@cubinghub.com", "Beta");
        User gamma = saveUser("gamma@cubinghub.com", "Gamma");

        saveRecord(alpha, EventType.WCA_333, 12000, Penalty.NONE, "scramble-a");
        saveRecord(beta, EventType.WCA_333, 9800, Penalty.NONE, "scramble-b");
        saveRecord(gamma, EventType.WCA_333, 11000, Penalty.NONE, "scramble-c");
        saveRecord(testUser, EventType.WCA_333, 9000, Penalty.DNF, "scramble-dnf");
        saveRecord(testUser, EventType.WCA_222, 7000, Penalty.NONE, "scramble-other-event");

        ResultActions result = mockMvc.perform(get("/api/rankings")
                .param("eventType", EventType.WCA_333.name())
                .accept(MediaType.APPLICATION_JSON));

        result.andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[0].rank").value(1))
                .andExpect(jsonPath("$[0].nickname").value("Beta"))
                .andExpect(jsonPath("$[0].eventType").value(EventType.WCA_333.name()))
                .andExpect(jsonPath("$[0].timeMs").value(9800))
                .andExpect(jsonPath("$[1].rank").value(2))
                .andExpect(jsonPath("$[1].nickname").value("Gamma"))
                .andExpect(jsonPath("$[1].timeMs").value(11000))
                .andExpect(jsonPath("$[2].rank").value(3))
                .andExpect(jsonPath("$[2].nickname").value("Alpha"))
                .andExpect(jsonPath("$[2].timeMs").value(12000))
                .andDo(document("ranking/list",
                        queryParameters(
                                parameterWithName("eventType").description("조회할 WCA 종목 코드 (e.g. WCA_333)")
                        ),
                        responseFields(
                                fieldWithPath("[].rank").description("랭킹 순위 (1부터 시작)"),
                                fieldWithPath("[].nickname").description("사용자 닉네임"),
                                fieldWithPath("[].eventType").description("WCA 종목 코드"),
                                fieldWithPath("[].timeMs").description("기록 시간 (밀리초)")
                        )
                ));
    }

    @Test
    @DisplayName("글로벌 랭킹은 최대 100건까지만 반환한다")
    void getRankingsLimit100() throws Exception {
        List<User> rankingUsers = new ArrayList<>();
        for (int i = 0; i < 101; i++) {
            User user = saveUser("ranker" + i + "@cubinghub.com", "Ranker" + i);
            rankingUsers.add(user);
            saveRecord(user, EventType.WCA_333, 10000 + i, Penalty.NONE, "scramble-" + i);
        }

        mockMvc.perform(get("/api/rankings")
                .param("eventType", EventType.WCA_333.name())
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(100))
                .andExpect(jsonPath("$[0].rank").value(1))
                .andExpect(jsonPath("$[99].rank").value(100))
                .andExpect(jsonPath("$[99].nickname").value("Ranker99"))
                .andExpect(jsonPath("$[99].timeMs").value(10099));
    }

    private User saveUser(String email, String nickname) {
        return userRepository.save(User.builder()
                .email(email)
                .password("password")
                .nickname(nickname)
                .role(UserRole.ROLE_USER)
                .status(UserStatus.ACTIVE)
                .build());
    }

    private void saveRecord(User user, EventType eventType, int timeMs, Penalty penalty, String scramble) {
        recordRepository.save(Record.builder()
                .user(user)
                .eventType(eventType)
                .timeMs(timeMs)
                .penalty(penalty)
                .scramble(scramble)
                .build());
    }
}
