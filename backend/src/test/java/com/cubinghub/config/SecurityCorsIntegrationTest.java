package com.cubinghub.config;

import static org.assertj.core.api.Assertions.assertThat;

import com.cubinghub.integration.HttpIntegrationTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.TestPropertySource;

/** 실제 HTTP preflight 요청 기준으로 CORS 허용 정책을 검증한다. */
@DisplayName("Security CORS 통합 테스트")
@TestPropertySource(properties = "cors.allowed-origins=https://cubing-hub.com,https://www.cubing-hub.com")
class SecurityCorsIntegrationTest extends HttpIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    @DisplayName("apex origin의 preflight 요청에는 CORS 응답 헤더가 포함된다")
    void should_return_cors_headers_when_preflight_request_origin_is_cubing_hub_apex() {
        HttpHeaders headers = new HttpHeaders();
        headers.setOrigin("https://cubing-hub.com");
        headers.add(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, HttpMethod.POST.name());

        ResponseEntity<String> response = restTemplate.exchange(
                "/api/auth/login",
                HttpMethod.OPTIONS,
                new HttpEntity<>(headers),
                String.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getHeaders().getAccessControlAllowOrigin()).isEqualTo("https://cubing-hub.com");
        assertThat(response.getHeaders().getAccessControlAllowCredentials()).isTrue();
        assertThat(response.getHeaders().getAccessControlAllowMethods()).contains(HttpMethod.POST);
    }

    @Test
    @DisplayName("www origin의 preflight 요청에는 CORS 응답 헤더가 포함된다")
    void should_return_cors_headers_when_preflight_request_origin_is_www_cubing_hub() {
        HttpHeaders headers = new HttpHeaders();
        headers.setOrigin("https://www.cubing-hub.com");
        headers.add(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, HttpMethod.POST.name());

        ResponseEntity<String> response = restTemplate.exchange(
                "/api/auth/login",
                HttpMethod.OPTIONS,
                new HttpEntity<>(headers),
                String.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getHeaders().getAccessControlAllowOrigin()).isEqualTo("https://www.cubing-hub.com");
        assertThat(response.getHeaders().getAccessControlAllowCredentials()).isTrue();
        assertThat(response.getHeaders().getAccessControlAllowMethods()).contains(HttpMethod.POST);
    }

    @Test
    @DisplayName("허용되지 않은 origin의 preflight 요청에는 CORS 허용 헤더가 포함되지 않는다")
    void should_not_return_allow_origin_header_when_preflight_request_origin_is_not_allowed() {
        HttpHeaders headers = new HttpHeaders();
        headers.setOrigin("http://malicious.example.com");
        headers.add(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, HttpMethod.POST.name());

        ResponseEntity<String> response = restTemplate.exchange(
                "/api/auth/login",
                HttpMethod.OPTIONS,
                new HttpEntity<>(headers),
                String.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(response.getHeaders().getAccessControlAllowOrigin()).isNull();
    }
}
