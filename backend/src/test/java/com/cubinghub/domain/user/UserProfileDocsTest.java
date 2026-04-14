package com.cubinghub.domain.user;

import static org.hamcrest.Matchers.nullValue;
import static org.springframework.restdocs.headers.HeaderDocumentation.headerWithName;
import static org.springframework.restdocs.headers.HeaderDocumentation.requestHeaders;
import static org.springframework.restdocs.mockmvc.MockMvcRestDocumentation.document;
import static org.springframework.restdocs.mockmvc.RestDocumentationRequestBuilders.get;
import static org.springframework.restdocs.payload.PayloadDocumentation.fieldWithPath;
import static org.springframework.restdocs.payload.PayloadDocumentation.responseFields;
import static org.springframework.restdocs.request.RequestDocumentation.parameterWithName;
import static org.springframework.restdocs.request.RequestDocumentation.queryParameters;
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
import com.cubinghub.integration.RestDocsIntegrationTest;
import com.cubinghub.security.JwtTokenProvider;
import com.cubinghub.support.TestFixtures;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.restdocs.payload.JsonFieldType;

class UserProfileDocsTest extends RestDocsIntegrationTest {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RecordRepository recordRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Test
    @DisplayName("인증된 사용자의 마이페이지 프로필을 조회한다")
    void should_return_my_profile_when_authorized() throws Exception {
        User savedUser = userRepository.save(User.builder()
                .email("test@cubinghub.com")
                .password("password")
                .nickname("TestUser")
                .role(UserRole.ROLE_USER)
                .status(UserStatus.ACTIVE)
                .mainEvent("3x3x3")
                .build());
        saveRecord(savedUser, EventType.WCA_333, 10000, Penalty.NONE, "best");
        saveRecord(savedUser, EventType.WCA_333, 9000, Penalty.PLUS_TWO, "plus-two");
        saveRecord(savedUser, EventType.WCA_333, 12000, Penalty.DNF, "dnf");

        String accessToken = TestFixtures.generateAccessToken(jwtTokenProvider, savedUser);

        mockMvc.perform(get("/api/users/me/profile")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.message").value("마이페이지 정보를 조회했습니다."))
                .andExpect(jsonPath("$.data.userId").value(savedUser.getId()))
                .andExpect(jsonPath("$.data.nickname").value("TestUser"))
                .andExpect(jsonPath("$.data.summary.totalSolveCount").value(3))
                .andDo(document("user/profile",
                        requestHeaders(
                                headerWithName("Authorization").description("Access Token을 담은 Bearer 인증 헤더")
                        ),
                        responseFields(
                                fieldWithPath("status").type(JsonFieldType.NUMBER).description("HTTP 상태 코드"),
                                fieldWithPath("message").type(JsonFieldType.STRING).description("응답 메시지"),
                                fieldWithPath("data").type(JsonFieldType.OBJECT).description("마이페이지 응답"),
                                fieldWithPath("data.userId").type(JsonFieldType.NUMBER).description("현재 로그인 사용자 ID"),
                                fieldWithPath("data.nickname").type(JsonFieldType.STRING).description("현재 로그인 사용자 닉네임"),
                                fieldWithPath("data.mainEvent").type(JsonFieldType.STRING).description("현재 로그인 사용자 주 종목"),
                                fieldWithPath("data.summary").type(JsonFieldType.OBJECT).description("기록 요약 정보"),
                                fieldWithPath("data.summary.totalSolveCount").type(JsonFieldType.NUMBER).description("전체 기록 수"),
                                fieldWithPath("data.summary.personalBestTimeMs").type(JsonFieldType.NUMBER).description("유효 시간 기준 최고 기록 (밀리초)"),
                                fieldWithPath("data.summary.averageTimeMs").type(JsonFieldType.NUMBER).description("DNF 제외 평균 기록 (밀리초)")
                        )
                ));
    }

    @Test
    @DisplayName("인증된 사용자의 마이페이지 기록 목록을 페이지네이션으로 조회한다")
    void should_return_my_records_when_authorized() throws Exception {
        User savedUser = userRepository.save(User.builder()
                .email("records@cubinghub.com")
                .password("password")
                .nickname("RecordsUser")
                .role(UserRole.ROLE_USER)
                .status(UserStatus.ACTIVE)
                .mainEvent("3x3x3")
                .build());
        saveRecord(savedUser, EventType.WCA_333, 10000, Penalty.NONE, "first");
        saveRecord(savedUser, EventType.WCA_333, 9000, Penalty.PLUS_TWO, "second");
        saveRecord(savedUser, EventType.WCA_333, 12000, Penalty.DNF, "third");

        String accessToken = TestFixtures.generateAccessToken(jwtTokenProvider, savedUser);

        mockMvc.perform(get("/api/users/me/records")
                        .header("Authorization", "Bearer " + accessToken)
                        .param("page", "1")
                        .param("size", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.message").value("내 기록을 조회했습니다."))
                .andExpect(jsonPath("$.data.items.length()").value(2))
                .andExpect(jsonPath("$.data.totalElements").value(3))
                .andDo(document("user/records",
                        requestHeaders(
                                headerWithName("Authorization").description("Access Token을 담은 Bearer 인증 헤더")
                        ),
                        queryParameters(
                                parameterWithName("page").optional().description("1부터 시작하는 페이지 번호 (기본값 1)"),
                                parameterWithName("size").optional().description("페이지 크기 (기본값 10, 최대 100)")
                        ),
                        responseFields(
                                fieldWithPath("status").type(JsonFieldType.NUMBER).description("HTTP 상태 코드"),
                                fieldWithPath("message").type(JsonFieldType.STRING).description("응답 메시지"),
                                fieldWithPath("data").type(JsonFieldType.OBJECT).description("내 기록 페이지 응답"),
                                fieldWithPath("data.items").type(JsonFieldType.ARRAY).description("현재 페이지 기록 목록"),
                                fieldWithPath("data.items[].id").type(JsonFieldType.NUMBER).description("기록 ID"),
                                fieldWithPath("data.items[].eventType").type(JsonFieldType.STRING).description("WCA 종목 코드"),
                                fieldWithPath("data.items[].timeMs").type(JsonFieldType.NUMBER).description("원본 측정 시간 (밀리초)"),
                                fieldWithPath("data.items[].effectiveTimeMs").type(JsonFieldType.NUMBER).optional().description("페널티 반영 시간 (DNF면 null)"),
                                fieldWithPath("data.items[].penalty").type(JsonFieldType.STRING).description("페널티 정보"),
                                fieldWithPath("data.items[].createdAt").type(JsonFieldType.STRING).description("기록 생성 시각"),
                                fieldWithPath("data.page").type(JsonFieldType.NUMBER).description("현재 페이지 번호 (1부터 시작)"),
                                fieldWithPath("data.size").type(JsonFieldType.NUMBER).description("페이지 크기"),
                                fieldWithPath("data.totalElements").type(JsonFieldType.NUMBER).description("전체 기록 수"),
                                fieldWithPath("data.totalPages").type(JsonFieldType.NUMBER).description("전체 페이지 수"),
                                fieldWithPath("data.hasNext").type(JsonFieldType.BOOLEAN).description("다음 페이지 존재 여부"),
                                fieldWithPath("data.hasPrevious").type(JsonFieldType.BOOLEAN).description("이전 페이지 존재 여부")
                        )
                ));
    }

    @Test
    @DisplayName("Authorization 헤더 없이 마이페이지 프로필 조회를 요청하면 401을 반환한다")
    void should_return_unauthorized_when_authorization_header_is_missing() throws Exception {
        mockMvc.perform(get("/api/users/me/profile"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("인증이 필요합니다."))
                .andExpect(jsonPath("$.data").value(nullValue()))
                .andDo(document("user/profile/unauthorized",
                        responseFields(
                                fieldWithPath("status").type(JsonFieldType.NUMBER).description("HTTP 상태 코드"),
                                fieldWithPath("message").type(JsonFieldType.STRING).description("응답 메시지"),
                                fieldWithPath("data").type(JsonFieldType.NULL).description("실패 시 추가 데이터 없음")
                        )
                ));
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
