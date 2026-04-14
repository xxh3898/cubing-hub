package com.cubinghub.domain.record;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.cubinghub.domain.record.dto.request.RecordPenaltyUpdateRequest;
import com.cubinghub.domain.record.dto.request.RecordSaveRequest;
import com.cubinghub.domain.record.entity.EventType;
import com.cubinghub.domain.record.entity.Penalty;
import com.cubinghub.domain.record.entity.Record;
import com.cubinghub.domain.record.entity.UserPB;
import com.cubinghub.domain.record.repository.RecordRepository;
import com.cubinghub.domain.record.repository.UserPBRepository;
import com.cubinghub.domain.user.entity.User;
import com.cubinghub.domain.user.entity.UserRole;
import com.cubinghub.domain.user.entity.UserStatus;
import com.cubinghub.domain.user.repository.UserRepository;
import com.cubinghub.integration.JpaIntegrationTest;
import com.cubinghub.security.JwtTokenProvider;
import com.cubinghub.support.TestFixtures;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc
@DisplayName("RecordController 통합 테스트")
class RecordControllerIntegrationTest extends JpaIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

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

    @Autowired
    private EntityManager entityManager;

    private User testUser;
    private User otherUser;
    private String accessToken;
    private String otherAccessToken;

    @BeforeEach
    void setUp() {
        testUser = userRepository.save(User.builder()
                .email("tester@cubinghub.com")
                .password("password")
                .nickname("Tester")
                .role(UserRole.ROLE_USER)
                .status(UserStatus.ACTIVE)
                .build());
        otherUser = userRepository.save(User.builder()
                .email("other@cubinghub.com")
                .password("password")
                .nickname("Other")
                .role(UserRole.ROLE_USER)
                .status(UserStatus.ACTIVE)
                .build());
        accessToken = TestFixtures.generateAccessToken(jwtTokenProvider, testUser);
        otherAccessToken = TestFixtures.generateAccessToken(jwtTokenProvider, otherUser);
    }

    @Test
    @DisplayName("유효한 기록 저장 요청을 보내면 기록과 PB를 함께 저장한다")
    void should_create_record_and_pb_when_record_request_is_valid() throws Exception {
        RecordSaveRequest request = RecordSaveRequest.builder()
                .eventType(EventType.WCA_333)
                .timeMs(12500)
                .penalty(Penalty.NONE)
                .scramble("R U R' U' R F R2 U' R' U' R U R' F'")
                .build();

        mockMvc.perform(post("/api/records")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.message").value("기록이 저장되었습니다."))
                .andExpect(jsonPath("$.data.id").exists());

        entityManager.flush();
        entityManager.clear();

        User foundUser = userRepository.findById(testUser.getId()).orElseThrow();
        assertThat(recordRepository.findAll()).hasSize(1);
        Record savedRecord = recordRepository.findAll().get(0);
        assertThat(savedRecord.getTimeMs()).isEqualTo(12500);
        assertThat(savedRecord.getUser().getId()).isEqualTo(testUser.getId());

        UserPB pb = userPBRepository.findByUserAndEventType(foundUser, EventType.WCA_333).orElseThrow();
        assertThat(pb.getBestTimeMs()).isEqualTo(12500);
        assertThat(pb.getRecord().getId()).isEqualTo(savedRecord.getId());
    }

    @Test
    @DisplayName("유효하지 않은 기록 저장 요청을 보내면 400을 반환한다")
    void should_return_bad_request_when_record_request_is_invalid() throws Exception {
        RecordSaveRequest request = RecordSaveRequest.builder()
                .eventType(EventType.WCA_333)
                .timeMs(0)
                .penalty(Penalty.NONE)
                .scramble("")
                .build();

        mockMvc.perform(post("/api/records")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value(containsString("잘못된 입력값입니다")));
    }

    @Test
    @DisplayName("더 빠른 기록 저장 요청을 보내면 기존 PB를 갱신한다")
    void should_update_existing_pb_when_faster_record_is_saved() throws Exception {
        Record initialRecord = recordRepository.save(Record.builder()
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
                .record(initialRecord)
                .build());

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

        entityManager.flush();
        entityManager.clear();

        User foundUser = userRepository.findById(testUser.getId()).orElseThrow();
        UserPB pb = userPBRepository.findByUserAndEventType(foundUser, EventType.WCA_333).orElseThrow();
        assertThat(pb.getBestTimeMs()).isEqualTo(10000);
        assertThat(recordRepository.findAll()).hasSize(2);
    }

    @Test
    @DisplayName("DNF 기록 저장 요청을 보내면 기록은 저장되지만 PB는 생성되지 않는다")
    void should_save_record_without_creating_pb_when_penalty_is_dnf() throws Exception {
        RecordSaveRequest request = RecordSaveRequest.builder()
                .eventType(EventType.WCA_333)
                .timeMs(20000)
                .penalty(Penalty.DNF)
                .scramble("dnf scramble")
                .build();

        mockMvc.perform(post("/api/records")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.message").value("기록이 저장되었습니다."));

        entityManager.flush();
        entityManager.clear();

        User foundUser = userRepository.findById(testUser.getId()).orElseThrow();
        assertThat(recordRepository.findAll()).hasSize(1);
        assertThat(recordRepository.findAll().get(0).getPenalty()).isEqualTo(Penalty.DNF);
        assertThat(userPBRepository.findByUserAndEventType(foundUser, EventType.WCA_333)).isEmpty();
    }

    @Test
    @DisplayName("기록 소유자가 페널티를 PLUS_TWO로 수정하면 PB를 다시 계산한다")
    void should_recalculate_pb_when_record_owner_updates_penalty_to_plus_two() throws Exception {
        Record bestRecord = recordRepository.save(Record.builder()
                .user(testUser)
                .eventType(EventType.WCA_333)
                .timeMs(10000)
                .penalty(Penalty.NONE)
                .scramble("best")
                .build());
        Record fallbackRecord = recordRepository.save(Record.builder()
                .user(testUser)
                .eventType(EventType.WCA_333)
                .timeMs(10500)
                .penalty(Penalty.NONE)
                .scramble("fallback")
                .build());
        userPBRepository.save(UserPB.builder()
                .user(testUser)
                .eventType(EventType.WCA_333)
                .bestTimeMs(10000)
                .record(bestRecord)
                .build());
        RecordPenaltyUpdateRequest request = RecordPenaltyUpdateRequest.builder()
                .penalty(Penalty.PLUS_TWO)
                .build();

        mockMvc.perform(patch("/api/records/{recordId}", bestRecord.getId())
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("기록 페널티가 수정되었습니다."))
                .andExpect(jsonPath("$.data.id").value(bestRecord.getId()))
                .andExpect(jsonPath("$.data.penalty").value(Penalty.PLUS_TWO.name()))
                .andExpect(jsonPath("$.data.effectiveTimeMs").value(12000));

        entityManager.flush();
        entityManager.clear();

        User foundUser = userRepository.findById(testUser.getId()).orElseThrow();
        Record updatedRecord = recordRepository.findById(bestRecord.getId()).orElseThrow();
        UserPB updatedPb = userPBRepository.findByUserAndEventType(foundUser, EventType.WCA_333).orElseThrow();

        assertThat(updatedRecord.getPenalty()).isEqualTo(Penalty.PLUS_TWO);
        assertThat(updatedPb.getBestTimeMs()).isEqualTo(10500);
        assertThat(updatedPb.getRecord().getId()).isEqualTo(fallbackRecord.getId());
    }

    @Test
    @DisplayName("마지막 PB 기록을 DNF로 수정하면 PB가 제거된다")
    void should_delete_pb_when_only_best_record_is_updated_to_dnf() throws Exception {
        Record onlyRecord = recordRepository.save(Record.builder()
                .user(testUser)
                .eventType(EventType.WCA_333)
                .timeMs(10000)
                .penalty(Penalty.NONE)
                .scramble("only")
                .build());
        userPBRepository.save(UserPB.builder()
                .user(testUser)
                .eventType(EventType.WCA_333)
                .bestTimeMs(10000)
                .record(onlyRecord)
                .build());
        RecordPenaltyUpdateRequest request = RecordPenaltyUpdateRequest.builder()
                .penalty(Penalty.DNF)
                .build();

        mockMvc.perform(patch("/api/records/{recordId}", onlyRecord.getId())
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.penalty").value(Penalty.DNF.name()))
                .andExpect(jsonPath("$.data.effectiveTimeMs").doesNotExist());

        entityManager.flush();
        entityManager.clear();

        User foundUser = userRepository.findById(testUser.getId()).orElseThrow();
        assertThat(recordRepository.findById(onlyRecord.getId()).orElseThrow().getPenalty()).isEqualTo(Penalty.DNF);
        assertThat(userPBRepository.findByUserAndEventType(foundUser, EventType.WCA_333)).isEmpty();
    }

    @Test
    @DisplayName("인증 없이 기록 페널티 수정 요청을 보내면 401을 반환한다")
    void should_return_unauthorized_when_updating_record_penalty_without_authentication() throws Exception {
        Record record = recordRepository.save(Record.builder()
                .user(testUser)
                .eventType(EventType.WCA_333)
                .timeMs(10000)
                .penalty(Penalty.NONE)
                .scramble("record")
                .build());
        RecordPenaltyUpdateRequest request = RecordPenaltyUpdateRequest.builder()
                .penalty(Penalty.PLUS_TWO)
                .build();

        mockMvc.perform(patch("/api/records/{recordId}", record.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("인증이 필요합니다."));
    }

    @Test
    @DisplayName("다른 사용자가 기록 페널티 수정 요청을 보내면 403을 반환한다")
    void should_return_forbidden_when_non_owner_updates_record_penalty() throws Exception {
        Record record = recordRepository.save(Record.builder()
                .user(testUser)
                .eventType(EventType.WCA_333)
                .timeMs(10000)
                .penalty(Penalty.NONE)
                .scramble("record")
                .build());
        RecordPenaltyUpdateRequest request = RecordPenaltyUpdateRequest.builder()
                .penalty(Penalty.PLUS_TWO)
                .build();

        mockMvc.perform(patch("/api/records/{recordId}", record.getId())
                        .header("Authorization", "Bearer " + otherAccessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("기록 수정 권한이 없습니다."));
    }

    @Test
    @DisplayName("존재하지 않는 기록 페널티 수정 요청을 보내면 404를 반환한다")
    void should_return_not_found_when_updating_missing_record_penalty() throws Exception {
        RecordPenaltyUpdateRequest request = RecordPenaltyUpdateRequest.builder()
                .penalty(Penalty.PLUS_TWO)
                .build();

        mockMvc.perform(patch("/api/records/{recordId}", 99999L)
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("기록을 찾을 수 없습니다."));
    }

    @Test
    @DisplayName("유효하지 않은 기록 페널티 수정 요청을 보내면 400을 반환한다")
    void should_return_bad_request_when_updating_record_penalty_with_invalid_request() throws Exception {
        Record record = recordRepository.save(Record.builder()
                .user(testUser)
                .eventType(EventType.WCA_333)
                .timeMs(10000)
                .penalty(Penalty.NONE)
                .scramble("record")
                .build());

        mockMvc.perform(patch("/api/records/{recordId}", record.getId())
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"penalty\":null}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value(containsString("잘못된 입력값입니다")));
    }
}
