package com.cubinghub.domain.post.storage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.cubinghub.common.exception.CustomApiException;
import com.cubinghub.config.PostImageStorageProperties;
import java.io.IOException;
import java.time.LocalDate;
import java.util.regex.Pattern;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectResponse;

@ExtendWith(MockitoExtension.class)
@DisplayName("S3PostImageStorageService 단위 테스트")
class S3PostImageStorageServiceTest {

    @Mock
    private S3Client s3Client;

    private PostImageStorageProperties properties;
    private S3PostImageStorageService storageService;

    @BeforeEach
    void setUp() {
        properties = new PostImageStorageProperties();
        properties.setBucket("cubinghub-images");
        properties.setRegion("ap-northeast-2");
        properties.setKeyPrefix("community/posts");
        storageService = new S3PostImageStorageService(s3Client, properties);
    }

    @Test
    @DisplayName("publicBaseUrl이 있으면 업로드 결과 URL에 해당 base URL을 사용한다")
    void should_use_public_base_url_when_upload_succeeds() {
        properties.setPublicBaseUrl("https://cdn.cubinghub.com/images///");
        MockMultipartFile file = new MockMultipartFile("images", "Cube.PNG", "image/png", "image-data".getBytes());
        when(s3Client.putObject(any(PutObjectRequest.class), any(RequestBody.class)))
                .thenReturn(PutObjectResponse.builder().build());

        StoredPostImage storedImage = storageService.upload(file);

        ArgumentCaptor<PutObjectRequest> requestCaptor = ArgumentCaptor.forClass(PutObjectRequest.class);
        verify(s3Client).putObject(requestCaptor.capture(), any(RequestBody.class));

        PutObjectRequest request = requestCaptor.getValue();
        assertThat(request.bucket()).isEqualTo("cubinghub-images");
        assertThat(request.contentType()).isEqualTo("image/png");
        assertThat(request.key()).startsWith("community/posts/" + datePathPrefix() + "/");
        assertThat(request.key()).endsWith(".png");

        assertThat(storedImage.objectKey()).isEqualTo(request.key());
        assertThat(storedImage.imageUrl()).isEqualTo("https://cdn.cubinghub.com/images/" + request.key());
        assertThat(storedImage.originalFileName()).isEqualTo("Cube.PNG");
        assertThat(storedImage.contentType()).isEqualTo("image/png");
        assertThat(storedImage.fileSizeBytes()).isEqualTo(file.getSize());
    }

    @Test
    @DisplayName("publicBaseUrl이 없고 확장자와 contentType이 없으면 기본값으로 업로드 결과를 만든다")
    void should_use_s3_default_url_and_default_content_type_when_optional_file_metadata_is_missing() {
        MockMultipartFile file = new MockMultipartFile("images", null, null, "image-data".getBytes());
        when(s3Client.putObject(any(PutObjectRequest.class), any(RequestBody.class)))
                .thenReturn(PutObjectResponse.builder().build());

        StoredPostImage storedImage = storageService.upload(file);

        assertThat(storedImage.objectKey()).startsWith("community/posts/" + datePathPrefix() + "/");
        assertThat(storedImage.objectKey()).doesNotContain(".");
        assertThat(storedImage.imageUrl()).isEqualTo(
                "https://cubinghub-images.s3.ap-northeast-2.amazonaws.com/" + storedImage.objectKey()
        );
        assertThat(storedImage.originalFileName()).isEmpty();
        assertThat(storedImage.contentType()).isEqualTo("application/octet-stream");
    }

    @Test
    @DisplayName("확장자가 없는 파일명도 원본 이름은 유지하고 확장자 없이 저장한다")
    void should_keep_original_filename_without_extension_when_filename_has_no_extension() {
        MockMultipartFile file = new MockMultipartFile("images", "cube", "image/png", "image-data".getBytes());
        when(s3Client.putObject(any(PutObjectRequest.class), any(RequestBody.class)))
                .thenReturn(PutObjectResponse.builder().build());

        StoredPostImage storedImage = storageService.upload(file);

        assertThat(storedImage.originalFileName()).isEqualTo("cube");
        assertThat(storedImage.objectKey()).doesNotContain(".");
    }

    @Test
    @DisplayName("원본 파일명이 null이면 빈 문자열로 저장한다")
    void should_store_empty_original_filename_when_original_filename_is_null() throws IOException {
        MultipartFile file = org.mockito.Mockito.mock(MultipartFile.class);
        when(file.getOriginalFilename()).thenReturn(null);
        when(file.getContentType()).thenReturn("image/png");
        when(file.getSize()).thenReturn(3L);
        when(file.getInputStream()).thenReturn(new java.io.ByteArrayInputStream("abc".getBytes()));
        when(s3Client.putObject(any(PutObjectRequest.class), any(RequestBody.class)))
                .thenReturn(PutObjectResponse.builder().build());

        StoredPostImage storedImage = storageService.upload(file);

        assertThat(storedImage.originalFileName()).isEmpty();
    }

    @Test
    @DisplayName("파일 스트림을 읽는 중 IOException이 나면 503 예외를 던진다")
    void should_throw_service_unavailable_when_file_input_stream_throws_io_exception() throws IOException {
        MultipartFile file = org.mockito.Mockito.mock(MultipartFile.class);
        when(file.getOriginalFilename()).thenReturn("cube.png");
        when(file.getContentType()).thenReturn("image/png");
        when(file.getInputStream()).thenThrow(new IOException("stream failed"));

        assertThatThrownBy(() -> storageService.upload(file))
                .isInstanceOf(CustomApiException.class)
                .hasMessage("이미지 업로드 서비스에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.");
    }

    @Test
    @DisplayName("S3 client가 runtime 예외를 던지면 503 예외로 변환한다")
    void should_throw_service_unavailable_when_s3_client_throws_runtime_exception() {
        MockMultipartFile file = new MockMultipartFile("images", "cube.png", "image/png", "image-data".getBytes());
        when(s3Client.putObject(any(PutObjectRequest.class), any(RequestBody.class)))
                .thenThrow(new RuntimeException("s3 failed"));

        assertThatThrownBy(() -> storageService.upload(file))
                .isInstanceOf(CustomApiException.class)
                .hasMessage("이미지 업로드 서비스에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.");
    }

    @Test
    @DisplayName("삭제 요청 시 bucket과 object key를 사용해 S3 delete를 호출한다")
    void should_delete_object_when_delete_is_called() {
        storageService.delete("community/posts/2026/04/24/object-key.png");

        ArgumentCaptor<DeleteObjectRequest> captor = ArgumentCaptor.forClass(DeleteObjectRequest.class);
        verify(s3Client).deleteObject(captor.capture());
        assertThat(captor.getValue().bucket()).isEqualTo("cubinghub-images");
        assertThat(captor.getValue().key()).isEqualTo("community/posts/2026/04/24/object-key.png");
    }

    private String datePathPrefix() {
        LocalDate today = LocalDate.now();
        return "%d/%02d/%02d".formatted(today.getYear(), today.getMonthValue(), today.getDayOfMonth());
    }
}
