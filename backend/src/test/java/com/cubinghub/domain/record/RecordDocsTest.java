package com.cubinghub.domain.record;

import com.cubinghub.domain.record.dto.request.RecordSaveRequest;
import com.cubinghub.domain.record.dto.request.RecordPenaltyUpdateRequest;
import com.cubinghub.domain.record.entity.EventType;
import com.cubinghub.domain.record.entity.Penalty;
import com.cubinghub.domain.record.entity.Record;
import com.cubinghub.domain.record.entity.UserPB;
import com.cubinghub.domain.user.entity.User;
import com.cubinghub.domain.user.entity.UserRole;
import com.cubinghub.domain.user.entity.UserStatus;
import com.cubinghub.domain.user.repository.UserRepository;
import com.cubinghub.integration.RestDocsIntegrationTest;
import com.cubinghub.security.JwtTokenProvider;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Collections;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.restdocs.payload.JsonFieldType;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.test.web.servlet.ResultActions;

import static org.hamcrest.Matchers.nullValue;
import static org.springframework.restdocs.mockmvc.MockMvcRestDocumentation.document;
import static org.springframework.restdocs.mockmvc.RestDocumentationRequestBuilders.delete;
import static org.springframework.restdocs.mockmvc.RestDocumentationRequestBuilders.patch;
import static org.springframework.restdocs.mockmvc.RestDocumentationRequestBuilders.post;
import static org.springframework.restdocs.payload.PayloadDocumentation.fieldWithPath;
import static org.springframework.restdocs.payload.PayloadDocumentation.requestFields;
import static org.springframework.restdocs.payload.PayloadDocumentation.responseFields;
import static org.springframework.restdocs.request.RequestDocumentation.pathParameters;
import static org.springframework.restdocs.request.RequestDocumentation.parameterWithName;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class RecordDocsTest extends RestDocsIntegrationTest {

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private com.cubinghub.domain.record.repository.RecordRepository recordRepository;

    @Autowired
    private com.cubinghub.domain.record.repository.UserPBRepository userPBRepository;

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
    void should_create_record_when_record_request_is_valid() throws Exception {
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
    }

    @Test
    @DisplayName("유효하지 않은 기록 저장 요청이면 400 Bad Request를 반환한다")
    void should_return_bad_request_when_record_request_is_invalid() throws Exception {
        RecordSaveRequest request = RecordSaveRequest.builder()
                .eventType(EventType.WCA_333)
                .timeMs(0)
                .penalty(Penalty.NONE)
                .scramble("")
                .build();

        ResultActions result = mockMvc.perform(post("/api/records")
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)));

        result.andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").exists())
                .andExpect(jsonPath("$.data").value(nullValue()))
                .andDo(document("record/create/bad-request",
                        requestFields(
                                fieldWithPath("eventType").description("WCA 종목 코드 (e.g. WCA_333)"),
                                fieldWithPath("timeMs").description("측정 시간 (밀리초)"),
                                fieldWithPath("penalty").description("페널티 정보 (NONE, PLUS_TWO, DNF)"),
                                fieldWithPath("scramble").description("해당 측정에 사용된 스크램블 문자열")
                        ),
                        responseFields(
                                fieldWithPath("status").type(JsonFieldType.NUMBER).description("HTTP 상태 코드"),
                                fieldWithPath("message").type(JsonFieldType.STRING).description("응답 메시지"),
                                fieldWithPath("data").type(JsonFieldType.NULL).description("실패 시 추가 데이터 없음")
                        )
                ));
    }

    @Test
    @DisplayName("기록 페널티를 수정하고 성공 시 200 OK를 반환한다")
    void should_update_record_penalty_when_penalty_update_request_is_valid() throws Exception {
        Record savedRecord = recordRepository.save(Record.builder()
                .user(testUser)
                .eventType(EventType.WCA_333)
                .timeMs(10000)
                .penalty(Penalty.NONE)
                .scramble("best")
                .build());
        userPBRepository.save(UserPB.builder()
                .user(testUser)
                .eventType(EventType.WCA_333)
                .bestTimeMs(10000)
                .record(savedRecord)
                .build());
        RecordPenaltyUpdateRequest request = RecordPenaltyUpdateRequest.builder()
                .penalty(Penalty.PLUS_TWO)
                .build();

        ResultActions result = mockMvc.perform(patch("/api/records/{recordId}", savedRecord.getId())
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)));

        result.andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.message").value("기록 페널티가 수정되었습니다."))
                .andExpect(jsonPath("$.data.id").value(savedRecord.getId()))
                .andExpect(jsonPath("$.data.penalty").value(Penalty.PLUS_TWO.name()))
                .andExpect(jsonPath("$.data.effectiveTimeMs").value(12000))
                .andDo(document("record/update",
                        pathParameters(
                                parameterWithName("recordId").description("수정할 기록 ID")
                        ),
                        requestFields(
                                fieldWithPath("penalty").description("수정할 페널티 정보 (NONE, PLUS_TWO, DNF)")
                        ),
                        responseFields(
                                fieldWithPath("status").type(JsonFieldType.NUMBER).description("HTTP 상태 코드"),
                                fieldWithPath("message").type(JsonFieldType.STRING).description("응답 메시지"),
                                fieldWithPath("data").type(JsonFieldType.OBJECT).description("수정된 기록 정보"),
                                fieldWithPath("data.id").description("수정된 기록 ID"),
                                fieldWithPath("data.eventType").description("WCA 종목 코드"),
                                fieldWithPath("data.timeMs").description("원본 측정 시간 (밀리초)"),
                                fieldWithPath("data.effectiveTimeMs").description("페널티 반영 시간 (밀리초)"),
                                fieldWithPath("data.penalty").description("수정 후 페널티 정보")
                        )
                ));
    }

    @Test
    @DisplayName("유효하지 않은 기록 페널티 수정 요청이면 400 Bad Request를 반환한다")
    void should_return_bad_request_when_penalty_update_request_is_invalid() throws Exception {
        Record savedRecord = recordRepository.save(Record.builder()
                .user(testUser)
                .eventType(EventType.WCA_333)
                .timeMs(10000)
                .penalty(Penalty.NONE)
                .scramble("best")
                .build());

        ResultActions result = mockMvc.perform(patch("/api/records/{recordId}", savedRecord.getId())
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"penalty\":null}"));

        result.andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").exists())
                .andExpect(jsonPath("$.data").value(nullValue()))
                .andDo(document("record/update/bad-request",
                        pathParameters(
                                parameterWithName("recordId").description("수정할 기록 ID")
                        ),
                        requestFields(
                                fieldWithPath("penalty").description("수정할 페널티 정보 (NONE, PLUS_TWO, DNF)")
                        ),
                        responseFields(
                                fieldWithPath("status").type(JsonFieldType.NUMBER).description("HTTP 상태 코드"),
                                fieldWithPath("message").type(JsonFieldType.STRING).description("응답 메시지"),
                                fieldWithPath("data").type(JsonFieldType.NULL).description("실패 시 추가 데이터 없음")
                        )
                ));
    }

    @Test
    @DisplayName("기록을 삭제하고 성공 시 200 OK를 반환한다")
    void should_delete_record_when_record_delete_request_is_valid() throws Exception {
        Record bestRecord = recordRepository.save(Record.builder()
                .user(testUser)
                .eventType(EventType.WCA_333)
                .timeMs(10000)
                .penalty(Penalty.NONE)
                .scramble("best")
                .build());
        userPBRepository.save(UserPB.builder()
                .user(testUser)
                .eventType(EventType.WCA_333)
                .bestTimeMs(10000)
                .record(bestRecord)
                .build());

        ResultActions result = mockMvc.perform(delete("/api/records/{recordId}", bestRecord.getId())
                .header("Authorization", "Bearer " + accessToken));

        result.andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.message").value("기록이 삭제되었습니다."))
                .andExpect(jsonPath("$.data").value(nullValue()))
                .andDo(document("record/delete",
                        pathParameters(
                                parameterWithName("recordId").description("삭제할 기록 ID")
                        ),
                        responseFields(
                                fieldWithPath("status").type(JsonFieldType.NUMBER).description("HTTP 상태 코드"),
                                fieldWithPath("message").type(JsonFieldType.STRING).description("응답 메시지"),
                                fieldWithPath("data").type(JsonFieldType.NULL).description("삭제 성공 시 추가 데이터 없음")
                        )
                ));
    }
}
