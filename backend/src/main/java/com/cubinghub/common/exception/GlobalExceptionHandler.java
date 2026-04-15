package com.cubinghub.common.exception;

import com.cubinghub.common.response.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MissingRequestCookieException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.bind.MethodArgumentNotValidException;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(CustomApiException.class)
    public ResponseEntity<ApiResponse<Void>> handleCustomApiException(CustomApiException ex, HttpServletRequest request) {
        log.warn("예상 가능한 API 예외 - status: {}, request: {}, message: {}",
                ex.getStatus().value(), requestSummary(request), ex.getMessage());
        return ResponseEntity.status(ex.getStatus())
                .body(ApiResponse.error(ex.getStatus(), ex.getMessage()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<Void>> handleIllegalArgumentException(IllegalArgumentException ex, HttpServletRequest request) {
        log.warn("잘못된 요청 예외 - status: {}, request: {}, message: {}",
                HttpStatus.BAD_REQUEST.value(), requestSummary(request), ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.error(HttpStatus.BAD_REQUEST, ex.getMessage()));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ApiResponse<Void>> handleIllegalStateException(IllegalStateException ex, HttpServletRequest request) {
        log.warn("상태 예외 - status: {}, request: {}, message: {}",
                HttpStatus.BAD_REQUEST.value(), requestSummary(request), ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.error(HttpStatus.BAD_REQUEST, ex.getMessage()));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleDataIntegrityViolationException(
            DataIntegrityViolationException ex,
            HttpServletRequest request
    ) {
        log.warn("데이터 무결성 예외 - status: {}, request: {}, reason: {}",
                HttpStatus.CONFLICT.value(), requestSummary(request), ex.getMostSpecificCause().getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ApiResponse.error(HttpStatus.CONFLICT, "이미 존재하는 데이터이거나, 유효하지 않은 요청입니다."));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidationExceptions(
            MethodArgumentNotValidException ex,
            HttpServletRequest request
    ) {
        String errorMessage = ex.getBindingResult().getFieldErrors().stream()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .reduce((msg1, msg2) -> msg1 + ", " + msg2)
                .orElse("잘못된 입력값입니다.");
        log.warn("검증 실패 - status: {}, request: {}, message: {}",
                HttpStatus.BAD_REQUEST.value(), requestSummary(request), errorMessage);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.error(HttpStatus.BAD_REQUEST, "잘못된 입력값입니다: " + errorMessage));
    }

    @ExceptionHandler(MissingRequestCookieException.class)
    public ResponseEntity<ApiResponse<Void>> handleMissingRequestCookieException(
            MissingRequestCookieException ex,
            HttpServletRequest request
    ) {
        log.warn("필수 쿠키 누락 - status: {}, request: {}, cookie: {}",
                HttpStatus.BAD_REQUEST.value(), requestSummary(request), ex.getCookieName());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.error(HttpStatus.BAD_REQUEST, ex.getCookieName() + " 쿠키가 필요합니다."));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiResponse<Void>> handleMethodArgumentTypeMismatchException(
            MethodArgumentTypeMismatchException ex,
            HttpServletRequest request
    ) {
        String errorMessage = ex.getName() + " 파라미터 형식이 올바르지 않습니다.";
        log.warn("파라미터 타입 불일치 - status: {}, request: {}, parameter: {}, value: {}",
                HttpStatus.BAD_REQUEST.value(), requestSummary(request), ex.getName(), ex.getValue());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.error(HttpStatus.BAD_REQUEST, errorMessage));
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ApiResponse<Void>> handleAuthenticationException(
            AuthenticationException ex,
            HttpServletRequest request
    ) {
        log.warn("인증 예외 - status: {}, request: {}, reason: {}",
                HttpStatus.UNAUTHORIZED.value(), requestSummary(request), ex.getClass().getSimpleName());
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiResponse.error(HttpStatus.UNAUTHORIZED, "인증에 실패했습니다."));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGenericException(Exception ex, HttpServletRequest request) {
        log.error("처리되지 않은 예외 - status: {}, request: {}",
                HttpStatus.INTERNAL_SERVER_ERROR.value(), requestSummary(request), ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error(HttpStatus.INTERNAL_SERVER_ERROR, "서버 내부 오류가 발생했습니다."));
    }

    private String requestSummary(HttpServletRequest request) {
        return request.getMethod() + " " + request.getRequestURI();
    }
}
