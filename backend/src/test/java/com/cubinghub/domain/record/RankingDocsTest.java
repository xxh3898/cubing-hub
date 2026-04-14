package com.cubinghub.domain.record;

import com.cubinghub.domain.record.entity.EventType;
import com.cubinghub.domain.record.entity.Penalty;
import com.cubinghub.domain.record.entity.Record;
import com.cubinghub.domain.record.repository.RecordRepository;
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

import static org.springframework.restdocs.mockmvc.MockMvcRestDocumentation.document;
import static org.springframework.restdocs.mockmvc.RestDocumentationRequestBuilders.get;
import static org.springframework.restdocs.payload.PayloadDocumentation.fieldWithPath;
import static org.springframework.restdocs.payload.PayloadDocumentation.responseFields;
import static org.springframework.restdocs.request.RequestDocumentation.parameterWithName;
import static org.springframework.restdocs.request.RequestDocumentation.queryParameters;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class RankingDocsTest extends RestDocsIntegrationTest {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RecordRepository recordRepository;

    @Test
    @DisplayName("글로벌 랭킹은 DNF를 제외하고 같은 종목 기록을 빠른 순서로 최대 100건 반환한다")
    void should_return_rankings_excluding_dnf_when_event_type_is_requested() throws Exception {
        User testUser = saveUser("tester@cubinghub.com", "Tester");
        User alpha = saveUser("alpha@cubinghub.com", "Alpha");
        User beta = saveUser("beta@cubinghub.com", "Beta");
        User gamma = saveUser("gamma@cubinghub.com", "Gamma");

        saveRecord(alpha, EventType.WCA_333, 10000, Penalty.PLUS_TWO, "scramble-a");
        saveRecord(beta, EventType.WCA_333, 9800, Penalty.NONE, "scramble-b");
        saveRecord(gamma, EventType.WCA_333, 11000, Penalty.NONE, "scramble-c");
        saveRecord(testUser, EventType.WCA_333, 9000, Penalty.DNF, "scramble-dnf");
        saveRecord(testUser, EventType.WCA_222, 7000, Penalty.NONE, "scramble-other-event");

        ResultActions result = mockMvc.perform(get("/api/rankings")
                .param("eventType", EventType.WCA_333.name())
                .accept(MediaType.APPLICATION_JSON));

        result.andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.message").value("랭킹을 조회했습니다."))
                .andExpect(jsonPath("$.data.length()").value(3))
                .andExpect(jsonPath("$.data[0].rank").value(1))
                .andExpect(jsonPath("$.data[0].nickname").value("Beta"))
                .andExpect(jsonPath("$.data[0].eventType").value(EventType.WCA_333.name()))
                .andExpect(jsonPath("$.data[0].timeMs").value(9800))
                .andExpect(jsonPath("$.data[1].rank").value(2))
                .andExpect(jsonPath("$.data[1].nickname").value("Gamma"))
                .andExpect(jsonPath("$.data[1].timeMs").value(11000))
                .andExpect(jsonPath("$.data[2].rank").value(3))
                .andExpect(jsonPath("$.data[2].nickname").value("Alpha"))
                .andExpect(jsonPath("$.data[2].timeMs").value(12000))
                .andDo(document("ranking/list",
                        queryParameters(
                                parameterWithName("eventType").description("조회할 WCA 종목 코드 (e.g. WCA_333)")
                        ),
                        responseFields(
                                fieldWithPath("status").type(JsonFieldType.NUMBER).description("HTTP 상태 코드"),
                                fieldWithPath("message").type(JsonFieldType.STRING).description("응답 메시지"),
                                fieldWithPath("data").type(JsonFieldType.ARRAY).description("랭킹 목록"),
                                fieldWithPath("data[].rank").description("랭킹 순위 (1부터 시작)"),
                                fieldWithPath("data[].nickname").description("사용자 닉네임"),
                                fieldWithPath("data[].eventType").description("WCA 종목 코드"),
                                fieldWithPath("data[].timeMs").description("페널티 반영 기록 시간 (밀리초)")
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
