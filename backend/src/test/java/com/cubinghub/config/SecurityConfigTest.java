package com.cubinghub.config;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.cubinghub.integration.BaseIntegrationTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("SecurityConfig 통합 테스트")
class SecurityConfigTest extends BaseIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @DisplayName("인증 없이 /api/auth 경로는 접근이 허용된다 (permitAll)")
    void auth_경로_인증없이_접근허용() {
        // when
        ResponseEntity<String> response = restTemplate.getForEntity("/api/auth/test", String.class);

        // then: 404 Not Found는 경로가 없는 것이지 인증 문제(401/403)가 아님 → 보안 설정 정상
        assertThat(response.getStatusCode()).isNotEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(response.getStatusCode()).isNotEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    @DisplayName("토큰 없이 보호된 API에 접근하면 401을 반환한다")
    void 토큰없이_보호된API_접근시_401반환() {
        // when
        ResponseEntity<String> response = restTemplate.getForEntity("/api/records", String.class);
        Map<String, Object> body = readBody(response);

        // then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(body.get("status")).isEqualTo(401);
        assertThat(body.get("message")).isEqualTo("인증이 필요합니다.");
        assertThat(body.get("data")).isNull();
    }

    @Test
    @DisplayName("잘못된 형식의 토큰으로 보호된 API에 접근하면 401을 반환한다")
    void 잘못된_토큰으로_보호된API_접근시_401반환() {
        // given
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer invalid.token.value");
        HttpEntity<Void> request = new HttpEntity<>(headers);

        // when
        ResponseEntity<String> response = restTemplate.exchange(
                "/api/records", HttpMethod.GET, request, String.class);
        Map<String, Object> body = readBody(response);

        // then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(body.get("status")).isEqualTo(401);
        assertThat(body.get("message")).isEqualTo("인증이 필요합니다.");
        assertThat(body.get("data")).isNull();
    }

    @Test
    @DisplayName("Actuator 헬스 체크 경로는 인증 없이 접근이 가능하다")
    void actuator_헬스체크_인증없이_접근가능() {
        // when
        ResponseEntity<String> response = restTemplate.getForEntity("/actuator/health", String.class);

        // then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    private Map<String, Object> readBody(ResponseEntity<String> response) {
        try {
            return objectMapper.readValue(response.getBody(), new TypeReference<>() {
            });
        } catch (Exception ex) {
            throw new AssertionError("응답 본문을 JSON으로 파싱하지 못했습니다.", ex);
        }
    }
}
