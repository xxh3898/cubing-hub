package com.cubinghub.domain.record;

import com.cubinghub.domain.record.entity.EventType;
import com.cubinghub.integration.RestDocsBaseTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.restdocs.payload.JsonFieldType;
import org.springframework.test.web.servlet.ResultActions;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.restdocs.mockmvc.MockMvcRestDocumentation.document;
import static org.springframework.restdocs.mockmvc.RestDocumentationRequestBuilders.get;
import static org.springframework.restdocs.payload.PayloadDocumentation.fieldWithPath;
import static org.springframework.restdocs.payload.PayloadDocumentation.responseFields;
import static org.springframework.restdocs.request.RequestDocumentation.parameterWithName;
import static org.springframework.restdocs.request.RequestDocumentation.queryParameters;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ScrambleIntegrationTest extends RestDocsBaseTest {

    @Test
    @DisplayName("지원 종목의 스크램블 조회에 성공한다")
    void getScramble() throws Exception {
        ResultActions result = mockMvc.perform(get("/api/scramble")
                .param("eventType", EventType.WCA_333.name())
                .accept(MediaType.APPLICATION_JSON));

        result.andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.message").value("스크램블을 생성했습니다."))
                .andExpect(jsonPath("$.data.eventType").value(EventType.WCA_333.name()))
                .andExpect(jsonPath("$.data.scramble").isString())
                .andExpect(jsonPath("$.data.scramble").value(containsString(" ")))
                .andDo(document("scramble/get",
                        queryParameters(
                                parameterWithName("eventType").description("스크램블을 생성할 WCA 종목 코드 (현재는 WCA_333만 지원)")
                        ),
                        responseFields(
                                fieldWithPath("status").type(JsonFieldType.NUMBER).description("HTTP 상태 코드"),
                                fieldWithPath("message").type(JsonFieldType.STRING).description("응답 메시지"),
                                fieldWithPath("data").type(JsonFieldType.OBJECT).description("생성된 스크램블 정보"),
                                fieldWithPath("data.eventType").type(JsonFieldType.STRING).description("WCA 종목 코드"),
                                fieldWithPath("data.scramble").type(JsonFieldType.STRING).description("생성된 스크램블 문자열")
                        )
                ));
    }

    @Test
    @DisplayName("미지원 종목으로 스크램블 조회 시 400을 반환한다")
    void getScrambleWithUnsupportedEvent() throws Exception {
        mockMvc.perform(get("/api/scramble")
                        .param("eventType", EventType.WCA_222.name())
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("아직 구현되지 않은 종목입니다."));
    }
}
