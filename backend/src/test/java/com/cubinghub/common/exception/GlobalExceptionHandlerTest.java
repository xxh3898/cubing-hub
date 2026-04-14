package com.cubinghub.common.exception;

import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@DisplayName("GlobalExceptionHandler 단위 테스트")
class GlobalExceptionHandlerTest {

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        mockMvc = MockMvcBuilders.standaloneSetup(new ExceptionThrowingController())
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("CustomApiException은 지정된 상태 코드와 메시지로 응답한다")
    void should_return_custom_api_response_when_custom_api_exception_is_thrown() throws Exception {
        mockMvc.perform(get("/test/custom"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.message").value("커스텀 예외"))
                .andExpect(jsonPath("$.data").isEmpty());
    }

    @Test
    @DisplayName("IllegalArgumentException은 400으로 응답한다")
    void should_return_bad_request_when_illegal_argument_exception_is_thrown() throws Exception {
        mockMvc.perform(get("/test/illegal-argument"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("잘못된 요청"))
                .andExpect(jsonPath("$.data").isEmpty());
    }

    @Test
    @DisplayName("IllegalStateException은 400으로 응답한다")
    void should_return_bad_request_when_illegal_state_exception_is_thrown() throws Exception {
        mockMvc.perform(get("/test/illegal-state"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("잘못된 상태"))
                .andExpect(jsonPath("$.data").isEmpty());
    }

    @Test
    @DisplayName("DataIntegrityViolationException은 409로 응답한다")
    void should_return_conflict_when_data_integrity_violation_exception_is_thrown() throws Exception {
        mockMvc.perform(get("/test/data-integrity"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.message").value("이미 존재하는 데이터이거나, 유효하지 않은 요청입니다."))
                .andExpect(jsonPath("$.data").isEmpty());
    }

    @Test
    @DisplayName("검증 실패는 400과 검증 메시지로 응답한다")
    void should_return_bad_request_with_validation_message_when_method_argument_not_valid_exception_is_thrown() throws Exception {
        mockMvc.perform(post("/test/validation")
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ValidationRequest(""))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("잘못된 입력값입니다: name: name is required"))
                .andExpect(jsonPath("$.data").isEmpty());
    }

    @Test
    @DisplayName("필수 쿠키가 없으면 400으로 응답한다")
    void should_return_bad_request_when_required_cookie_is_missing() throws Exception {
        mockMvc.perform(get("/test/missing-cookie"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("refresh_token 쿠키가 필요합니다."))
                .andExpect(jsonPath("$.data").isEmpty());
    }

    @Test
    @DisplayName("AuthenticationException은 401로 응답한다")
    void should_return_unauthorized_when_authentication_exception_is_thrown() throws Exception {
        mockMvc.perform(get("/test/authentication"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("인증에 실패했습니다."))
                .andExpect(jsonPath("$.data").isEmpty());
    }

    @Test
    @DisplayName("처리되지 않은 예외는 500으로 응답한다")
    void should_return_internal_server_error_when_unhandled_exception_is_thrown() throws Exception {
        mockMvc.perform(get("/test/generic"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.status").value(500))
                .andExpect(jsonPath("$.message").value("서버 내부 오류가 발생했습니다."))
                .andExpect(jsonPath("$.data").isEmpty());
    }

    @RestController
    private static class ExceptionThrowingController {

        @GetMapping("/test/custom")
        String custom() {
            throw new CustomApiException("커스텀 예외", HttpStatus.NOT_FOUND);
        }

        @GetMapping("/test/illegal-argument")
        String illegalArgument() {
            throw new IllegalArgumentException("잘못된 요청");
        }

        @GetMapping("/test/illegal-state")
        String illegalState() {
            throw new IllegalStateException("잘못된 상태");
        }

        @GetMapping("/test/data-integrity")
        String dataIntegrity() {
            throw new DataIntegrityViolationException("duplicate", new IllegalArgumentException("duplicate key"));
        }

        @PostMapping("/test/validation")
        String validation(@Valid @RequestBody ValidationRequest request) {
            return request.name();
        }

        @GetMapping("/test/missing-cookie")
        String missingCookie(@CookieValue("refresh_token") String refreshToken) {
            return refreshToken;
        }

        @GetMapping("/test/authentication")
        String authentication() {
            throw new BadCredentialsException("bad credentials");
        }

        @GetMapping("/test/generic")
        String generic() {
            throw new RuntimeException("boom");
        }
    }

    private record ValidationRequest(@NotBlank(message = "name is required") String name) {
    }
}
