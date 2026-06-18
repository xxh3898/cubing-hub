package com.cubinghub.domain.post.storage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.mockito.Mockito.when;

import com.cubinghub.common.exception.CustomApiException;
import com.cubinghub.config.PostImageStorageProperties;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

@DisplayName("LocalPostImageStorageService 단위 테스트")
class LocalPostImageStorageServiceTest {

    @TempDir
    private Path tempDir;

    private PostImageStorageProperties properties;
    private LocalPostImageStorageService storageService;

    @BeforeEach
    void setUp() {
        properties = new PostImageStorageProperties();
        properties.setKeyPrefix("community/posts");
        properties.setPublicBaseUrl("https://api.cubing-hub.com/uploads///");
        properties.setLocalRootPath(tempDir.toString());
        storageService = new LocalPostImageStorageService(properties);
    }

    @Test
    @DisplayName("업로드 성공 시 파일을 로컬 경로에 저장하고 공개 URL을 반환한다")
    void should_store_file_and_return_public_url_when_upload_succeeds() throws IOException {
        MockMultipartFile file = new MockMultipartFile("images", "Cube.PNG", "image/png", "image-data".getBytes());

        StoredPostImage storedImage = storageService.upload(file);

        Path storedFile = tempDir.resolve(storedImage.objectKey());
        assertThat(storedImage.objectKey()).startsWith("community/posts/" + datePathPrefix() + "/");
        assertThat(storedImage.objectKey()).endsWith(".png");
        assertThat(storedImage.imageUrl()).isEqualTo("https://api.cubing-hub.com/uploads/" + storedImage.objectKey());
        assertThat(storedImage.originalFileName()).isEqualTo("Cube.PNG");
        assertThat(storedImage.contentType()).isEqualTo("image/png");
        assertThat(storedImage.fileSizeBytes()).isEqualTo(file.getSize());
        assertThat(storedFile).exists();
        assertThat(Files.readString(storedFile)).isEqualTo("image-data");
    }

    @Test
    @DisplayName("원본 파일명과 contentType이 없으면 기본 메타데이터로 저장한다")
    void should_use_default_metadata_when_optional_file_metadata_is_missing() throws IOException {
        MultipartFile file = org.mockito.Mockito.mock(MultipartFile.class);
        when(file.getOriginalFilename()).thenReturn(null);
        when(file.getContentType()).thenReturn(null);
        when(file.getSize()).thenReturn(3L);
        when(file.getInputStream()).thenReturn(new ByteArrayInputStream("abc".getBytes()));

        StoredPostImage storedImage = storageService.upload(file);

        assertThat(storedImage.objectKey()).startsWith("community/posts/" + datePathPrefix() + "/");
        assertThat(storedImage.objectKey()).doesNotContain(".");
        assertThat(storedImage.originalFileName()).isEmpty();
        assertThat(storedImage.contentType()).isEqualTo("application/octet-stream");
        assertThat(Files.readString(tempDir.resolve(storedImage.objectKey()))).isEqualTo("abc");
    }

    @Test
    @DisplayName("삭제 요청 시 로컬 파일을 삭제한다")
    void should_delete_file_when_delete_is_called() throws IOException {
        Path storedFile = tempDir.resolve("community/posts/2026/06/18/object-key.png");
        Files.createDirectories(storedFile.getParent());
        Files.writeString(storedFile, "image-data");

        storageService.delete("community/posts/2026/06/18/object-key.png");

        assertThat(storedFile).doesNotExist();
    }

    @Test
    @DisplayName("삭제 대상 objectKey가 root 밖을 가리키면 503 예외를 던지고 외부 파일을 보존한다")
    void should_throw_service_unavailable_and_keep_outside_file_when_delete_path_escapes_root() throws IOException {
        Path outsideFile = tempDir.resolveSibling("outside.png");
        Files.writeString(outsideFile, "outside");

        Throwable thrown = catchThrowable(() -> storageService.delete("../outside.png"));

        assertThat(thrown).isInstanceOf(CustomApiException.class);
        CustomApiException exception = (CustomApiException) thrown;
        assertThat(exception.getStatus()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
        assertThat(exception.getMessage()).isEqualTo("이미지 업로드 서비스에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.");
        assertThat(outsideFile).exists();
    }

    @Test
    @DisplayName("파일 스트림을 읽는 중 IOException이 나면 503 예외를 던진다")
    void should_throw_service_unavailable_when_file_input_stream_throws_io_exception() throws IOException {
        MultipartFile file = org.mockito.Mockito.mock(MultipartFile.class);
        when(file.getOriginalFilename()).thenReturn("cube.png");
        when(file.getContentType()).thenReturn("image/png");
        when(file.getInputStream()).thenThrow(new IOException("stream failed"));

        Throwable thrown = catchThrowable(() -> storageService.upload(file));

        assertThat(thrown).isInstanceOf(CustomApiException.class);
        CustomApiException exception = (CustomApiException) thrown;
        assertThat(exception.getStatus()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
        assertThat(exception.getMessage()).isEqualTo("이미지 업로드 서비스에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.");
    }

    private String datePathPrefix() {
        LocalDate today = LocalDate.now();
        return "%d/%02d/%02d".formatted(today.getYear(), today.getMonthValue(), today.getDayOfMonth());
    }
}
