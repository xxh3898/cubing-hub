package com.cubinghub.domain.post.storage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;

import com.cubinghub.common.exception.CustomApiException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;

@DisplayName("UnavailablePostImageStorageService 단위 테스트")
class UnavailablePostImageStorageServiceTest {

    private final UnavailablePostImageStorageService storageService = new UnavailablePostImageStorageService();

    @Test
    @DisplayName("업로드 요청은 503 예외를 반환한다")
    void should_throw_service_unavailable_when_upload_is_requested() {
        MockMultipartFile file = new MockMultipartFile("images", "cube.png", "image/png", "image-data".getBytes());

        Throwable thrown = catchThrowable(() -> storageService.upload(file));

        assertThat(thrown).isInstanceOf(CustomApiException.class);
        CustomApiException exception = (CustomApiException) thrown;
        assertThat(exception.getStatus()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
        assertThat(exception.getMessage()).isEqualTo("이미지 업로드 서비스에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.");
    }

    @Test
    @DisplayName("삭제 요청은 503 예외를 반환한다")
    void should_throw_service_unavailable_when_delete_is_requested() {
        Throwable thrown = catchThrowable(() -> storageService.delete("object-key"));

        assertThat(thrown).isInstanceOf(CustomApiException.class);
        CustomApiException exception = (CustomApiException) thrown;
        assertThat(exception.getStatus()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
        assertThat(exception.getMessage()).isEqualTo("이미지 업로드 서비스에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.");
    }
}
