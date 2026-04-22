package com.cubinghub.config;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.cubinghub.domain.auth.repository.RedisBlackListService;
import com.cubinghub.security.JwtTokenProvider;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(controllers = TestPrometheusController.class)
@Import(SecurityConfig.class)
@TestPropertySource(properties = {
        "monitoring.prometheus.permit-all=true",
        "cors.allowed-origins=http://localhost:5173"
})
@DisplayName("Prometheus 공개 접근 테스트")
class SecurityPrometheusPublicAccessIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    @MockBean
    private RedisBlackListService redisBlackListService;

    @Test
    @DisplayName("Prometheus 공개 플래그가 켜지면 인증 없이 actuator prometheus 경로에 접근할 수 있다")
    void should_allow_access_to_actuator_prometheus_when_public_flag_is_enabled() throws Exception {
        mockMvc.perform(get("/actuator/prometheus"))
                .andExpect(status().isOk())
                .andExpect(content().string("prometheus"));
    }
}
