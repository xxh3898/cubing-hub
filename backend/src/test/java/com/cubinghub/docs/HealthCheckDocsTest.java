package com.cubinghub.docs;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import static org.springframework.restdocs.mockmvc.MockMvcRestDocumentation.document;
import static org.springframework.restdocs.mockmvc.RestDocumentationRequestBuilders.get;
import static org.springframework.restdocs.payload.PayloadDocumentation.fieldWithPath;
import static org.springframework.restdocs.payload.PayloadDocumentation.responseFields;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.cubinghub.integration.RestDocsBaseTest;

class HealthCheckDocsTest extends RestDocsBaseTest {

    @Test
    void should_document_health_status_when_health_endpoint_is_called() throws Exception {
        mockMvc.perform(get("/actuator/health")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andDo(document("health-check",
                        responseFields(
                                fieldWithPath("status").description("애플리케이션 상태 (UP / DOWN)")
                        )
                ));
    }
}
