package com.cubinghub.domain.record;

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
import com.cubinghub.domain.record.entity.UserPB;
import com.cubinghub.domain.record.repository.RecordRepository;
import com.cubinghub.domain.record.repository.UserPBRepository;
import com.cubinghub.domain.user.entity.User;
import com.cubinghub.domain.user.entity.UserRole;
import com.cubinghub.domain.user.entity.UserStatus;
import com.cubinghub.domain.user.repository.UserRepository;
import com.cubinghub.integration.RestDocsIntegrationTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.restdocs.payload.JsonFieldType;
import org.springframework.test.web.servlet.ResultActions;

class RankingDocsTest extends RestDocsIntegrationTest {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RecordRepository recordRepository;

    @Autowired
    private UserPBRepository userPBRepository;

    @Test
    @DisplayName("글로벌 랭킹은 PB 기준으로 검색과 페이지 메타데이터를 함께 반환한다")
    void should_return_rankings_with_pb_search_and_pagination_metadata() throws Exception {
        User alpha = saveUser("alpha@cubinghub.com", "AlphaCube");
        User beta = saveUser("beta@cubinghub.com", "Beta");
        User gamma = saveUser("gamma@cubinghub.com", "Gamma");

        saveRecord(alpha, EventType.WCA_333, 9800, Penalty.NONE, "alpha-history");
        Record alphaPbRecord = saveRecord(alpha, EventType.WCA_333, 10000, Penalty.PLUS_TWO, "alpha-pb");
        Record betaPbRecord = saveRecord(beta, EventType.WCA_333, 9800, Penalty.NONE, "beta-pb");
        Record gammaPbRecord = saveRecord(gamma, EventType.WCA_333, 11000, Penalty.NONE, "gamma-pb");

        saveUserPb(alpha, EventType.WCA_333, 12000, alphaPbRecord);
        saveUserPb(beta, EventType.WCA_333, 9800, betaPbRecord);
        saveUserPb(gamma, EventType.WCA_333, 11000, gammaPbRecord);

        ResultActions result = mockMvc.perform(get("/api/rankings")
                .param("eventType", EventType.WCA_333.name())
                .param("nickname", "a")
                .param("page", "1")
                .param("size", "2")
                .accept(MediaType.APPLICATION_JSON));

        result.andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.message").value("랭킹을 조회했습니다."))
                .andExpect(jsonPath("$.data.items.length()").value(2))
                .andExpect(jsonPath("$.data.items[0].rank").value(1))
                .andExpect(jsonPath("$.data.items[0].nickname").value("Beta"))
                .andExpect(jsonPath("$.data.items[0].eventType").value(EventType.WCA_333.name()))
                .andExpect(jsonPath("$.data.items[0].timeMs").value(9800))
                .andExpect(jsonPath("$.data.items[1].rank").value(2))
                .andExpect(jsonPath("$.data.items[1].nickname").value("Gamma"))
                .andExpect(jsonPath("$.data.items[1].timeMs").value(11000))
                .andExpect(jsonPath("$.data.page").value(1))
                .andExpect(jsonPath("$.data.size").value(2))
                .andExpect(jsonPath("$.data.totalElements").value(3))
                .andExpect(jsonPath("$.data.totalPages").value(2))
                .andExpect(jsonPath("$.data.hasNext").value(true))
                .andExpect(jsonPath("$.data.hasPrevious").value(false))
                .andDo(document("ranking/list",
                        queryParameters(
                                parameterWithName("eventType").description("조회할 WCA 종목 코드 (e.g. WCA_333)"),
                                parameterWithName("nickname").optional().description("닉네임 포함 검색어"),
                                parameterWithName("page").optional().description("1부터 시작하는 페이지 번호 (기본값 1)"),
                                parameterWithName("size").optional().description("페이지 크기 (기본값 25, 최대 100)")
                        ),
                        responseFields(
                                fieldWithPath("status").type(JsonFieldType.NUMBER).description("HTTP 상태 코드"),
                                fieldWithPath("message").type(JsonFieldType.STRING).description("응답 메시지"),
                                fieldWithPath("data").type(JsonFieldType.OBJECT).description("랭킹 페이지 응답"),
                                fieldWithPath("data.items").type(JsonFieldType.ARRAY).description("현재 페이지 랭킹 목록"),
                                fieldWithPath("data.items[].rank").description("랭킹 순위 (페이지 offset 포함, 1부터 시작)"),
                                fieldWithPath("data.items[].nickname").description("사용자 닉네임"),
                                fieldWithPath("data.items[].eventType").description("WCA 종목 코드"),
                                fieldWithPath("data.items[].timeMs").description("PB 기준 기록 시간 (밀리초)"),
                                fieldWithPath("data.page").type(JsonFieldType.NUMBER).description("현재 페이지 번호 (1부터 시작)"),
                                fieldWithPath("data.size").type(JsonFieldType.NUMBER).description("페이지 크기"),
                                fieldWithPath("data.totalElements").type(JsonFieldType.NUMBER).description("검색 조건을 반영한 전체 랭킹 수"),
                                fieldWithPath("data.totalPages").type(JsonFieldType.NUMBER).description("전체 페이지 수"),
                                fieldWithPath("data.hasNext").type(JsonFieldType.BOOLEAN).description("다음 페이지 존재 여부"),
                                fieldWithPath("data.hasPrevious").type(JsonFieldType.BOOLEAN).description("이전 페이지 존재 여부")
                        )
                ));
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

    private Record saveRecord(User user, EventType eventType, int timeMs, Penalty penalty, String scramble) {
        return recordRepository.save(Record.builder()
                .user(user)
                .eventType(eventType)
                .timeMs(timeMs)
                .penalty(penalty)
                .scramble(scramble)
                .build());
    }

    private void saveUserPb(User user, EventType eventType, int bestTimeMs, Record record) {
        userPBRepository.save(UserPB.builder()
                .user(user)
                .eventType(eventType)
                .bestTimeMs(bestTimeMs)
                .record(record)
                .build());
    }
}
