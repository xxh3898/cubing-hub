package com.cubinghub.config;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.core.type.TypeReference;
import com.cubinghub.domain.user.entity.UserRole;
import com.cubinghub.domain.user.entity.UserStatus;
import com.cubinghub.integration.BaseIntegrationTest;
import com.cubinghub.security.JwtTokenProvider;
import com.cubinghub.support.TestFixtures;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

@DisplayName("SecurityConfig 통합 테스트")
class SecurityConfigTest extends BaseIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Test
    @DisplayName("인증 없이 /api/auth/login 요청은 컨트롤러까지 도달해 400을 반환한다")
    void auth_경로_인증없이_접근허용() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        // when
        ResponseEntity<String> response = restTemplate.exchange(
                "/api/auth/login",
                HttpMethod.POST,
                new HttpEntity<>("{}", headers),
                String.class
        );
        Map<String, Object> body = readBody(response);

        // then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(body.get("status")).isEqualTo(400);
    }

    @Test
    @DisplayName("토큰 없이 보호된 API에 접근하면 401을 반환한다")
    void 토큰없이_보호된API_접근시_401반환() {
        // when
        ResponseEntity<String> response = restTemplate.postForEntity("/api/records", null, String.class);
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
                "/api/records", HttpMethod.POST, request, String.class);
        Map<String, Object> body = readBody(response);

        // then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(body.get("status")).isEqualTo(401);
        assertThat(body.get("message")).isEqualTo("인증이 필요합니다.");
        assertThat(body.get("data")).isNull();
    }

    @Test
    @DisplayName("로그아웃된 access token으로 보호된 API에 접근하면 401을 반환한다")
    void 로그아웃된_accessToken으로_보호된API_접근시_401반환() {
        // given
        String accessToken = TestFixtures.generateAccessToken(
                jwtTokenProvider,
                TestFixtures.createUser(1L, "blacklist@cubinghub.com", "BlacklistUser", UserRole.ROLE_USER, UserStatus.ACTIVE)
        );

        HttpHeaders logoutHeaders = new HttpHeaders();
        logoutHeaders.setBearerAuth(accessToken);
        ResponseEntity<String> logoutResponse = restTemplate.exchange(
                "/api/auth/logout",
                HttpMethod.POST,
                new HttpEntity<>(logoutHeaders),
                String.class
        );
        assertThat(logoutResponse.getStatusCode()).isEqualTo(HttpStatus.OK);

        HttpHeaders protectedHeaders = new HttpHeaders();
        protectedHeaders.setBearerAuth(accessToken);

        // when
        ResponseEntity<String> response = restTemplate.exchange(
                "/api/posts",
                HttpMethod.POST,
                new HttpEntity<>(protectedHeaders),
                String.class
        );
        Map<String, Object> body = readBody(response);

        // then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(body.get("status")).isEqualTo(401);
        assertThat(body.get("message")).isEqualTo("로그아웃 된 토큰입니다.");
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
