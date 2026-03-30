package com.cubinghub.common.exception;

import org.springframework.http.HttpStatus;

public class CustomApiException extends RuntimeException {
    private final HttpStatus status;

    public CustomApiException(String message, HttpStatus status) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
