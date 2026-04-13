package com.cubinghub.domain.record;

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
import com.cubinghub.integration.RestDocsBaseTest;
import com.cubinghub.security.JwtTokenProvider;
import com.fasterxml.jackson.databind.ObjectMapper;
import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.restdocs.payload.JsonFieldType;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.test.web.servlet.ResultActions;

import java.util.Collections;

import static org.springframework.restdocs.mockmvc.MockMvcRestDocumentation.document;
import static org.springframework.restdocs.mockmvc.RestDocumentationRequestBuilders.post;
import static org.springframework.restdocs.payload.PayloadDocumentation.fieldWithPath;
import static org.springframework.restdocs.payload.PayloadDocumentation.requestFields;
import static org.springframework.restdocs.payload.PayloadDocumentation.responseFields;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class RecordDocsTest extends RestDocsBaseTest {

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
    void should_create_record_and_update_pb_when_record_request_is_valid() throws Exception {
        RecordSaveRequest request = RecordSaveRequest.builder()
                .eventType(EventType.WCA_333)
                .timeMs(12500)
                .penalty(Penalty.NONE)
                .scramble("R U R' U' R F R2 U' R' U' R U R' F'")
                .build();

        ResultActions result = mockMvc.perform(post("/api/records")
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)));

        result.andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value(201))
                .andExpect(jsonPath("$.message").value("기록이 저장되었습니다."))
                .andExpect(jsonPath("$.data.id").exists())
                .andDo(document("record/create",
                        requestFields(
                                fieldWithPath("eventType").description("WCA 종목 코드 (e.g. WCA_333)"),
                                fieldWithPath("timeMs").description("측정 시간 (밀리초)"),
                                fieldWithPath("penalty").description("페널티 정보 (NONE, PLUS_TWO, DNF)"),
                                fieldWithPath("scramble").description("해당 측정에 사용된 스크램블 문자열")
                        ),
                        responseFields(
                                fieldWithPath("status").type(JsonFieldType.NUMBER).description("HTTP 상태 코드"),
                                fieldWithPath("message").type(JsonFieldType.STRING).description("응답 메시지"),
                                fieldWithPath("data").type(JsonFieldType.OBJECT).description("생성된 리소스 정보"),
                                fieldWithPath("data.id").description("생성된 기록 ID")
                        )
                ));

        assertThat(recordRepository.findAll()).hasSize(1);
        Record savedRecord = recordRepository.findAll().get(0);
        assertThat(savedRecord.getTimeMs()).isEqualTo(12500);
        assertThat(savedRecord.getUser().getId()).isEqualTo(testUser.getId());

        UserPB pb = userPBRepository.findByUserAndEventType(testUser, EventType.WCA_333).orElseThrow();
        assertThat(pb.getBestTimeMs()).isEqualTo(12500);
    }

    @Test
    @DisplayName("기록 저장 요청이 유효하지 않으면 400을 반환한다")
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
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("잘못된 입력값입니다")));
    }

    @Test
    @DisplayName("더 빠른 기록이 들어오면 PB가 자동으로 갱신된다")
    void should_update_existing_pb_when_faster_record_is_saved() throws Exception {
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

        UserPB pb = userPBRepository.findByUserAndEventType(testUser, EventType.WCA_333).orElseThrow();
        assertThat(pb.getBestTimeMs()).isEqualTo(10000);
    }
}
