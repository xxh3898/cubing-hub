package com.cubinghub.config;

import static org.assertj.core.api.Assertions.assertThat;

import com.cubinghub.domain.post.storage.LocalPostImageStorageService;
import com.cubinghub.domain.post.storage.PostImageStorageService;
import com.cubinghub.domain.post.storage.S3PostImageStorageService;
import com.cubinghub.domain.post.storage.UnavailablePostImageStorageService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("PostImageStorageConfig 단위 테스트")
class PostImageStorageConfigTest {

    private final PostImageStorageConfig config = new PostImageStorageConfig();

    @Test
    @DisplayName("bucket이 비어 있으면 unavailable storage를 반환한다")
    void should_return_unavailable_storage_when_bucket_is_blank() {
        PostImageStorageProperties properties = new PostImageStorageProperties();
        properties.setRegion("ap-northeast-2");

        PostImageStorageService storageService = config.postImageStorageService(properties);

        assertThat(storageService).isInstanceOf(UnavailablePostImageStorageService.class);
    }

    @Test
    @DisplayName("region이 비어 있으면 unavailable storage를 반환한다")
    void should_return_unavailable_storage_when_region_is_blank() {
        PostImageStorageProperties properties = new PostImageStorageProperties();
        properties.setBucket("cubinghub-images");

        PostImageStorageService storageService = config.postImageStorageService(properties);

        assertThat(storageService).isInstanceOf(UnavailablePostImageStorageService.class);
    }

    @Test
    @DisplayName("bucket과 region이 모두 있으면 S3 storage를 반환한다")
    void should_return_s3_storage_when_bucket_and_region_are_present_without_storage_type() {
        PostImageStorageProperties properties = new PostImageStorageProperties();
        properties.setBucket("cubinghub-images");
        properties.setRegion("ap-northeast-2");

        PostImageStorageService storageService = config.postImageStorageService(properties);

        assertThat(storageService).isInstanceOf(S3PostImageStorageService.class);
    }

    @Test
    @DisplayName("storageType이 s3이면 S3 storage를 반환한다")
    void should_return_s3_storage_when_storage_type_is_s3() {
        PostImageStorageProperties properties = new PostImageStorageProperties();
        properties.setStorageType("s3");
        properties.setBucket("cubinghub-images");
        properties.setRegion("ap-northeast-2");

        PostImageStorageService storageService = config.postImageStorageService(properties);

        assertThat(storageService).isInstanceOf(S3PostImageStorageService.class);
    }

    @Test
    @DisplayName("storageType이 local이고 로컬 설정이 있으면 local storage를 반환한다")
    void should_return_local_storage_when_storage_type_is_local_and_local_settings_are_present() {
        PostImageStorageProperties properties = new PostImageStorageProperties();
        properties.setStorageType("local");
        properties.setLocalRootPath("/tmp/cubing-hub-post-images");
        properties.setPublicBaseUrl("https://api.cubing-hub.com/uploads");

        PostImageStorageService storageService = config.postImageStorageService(properties);

        assertThat(storageService).isInstanceOf(LocalPostImageStorageService.class);
    }

    @Test
    @DisplayName("storageType이 local인데 root path가 없으면 unavailable storage를 반환한다")
    void should_return_unavailable_storage_when_local_root_path_is_blank_for_local_storage() {
        PostImageStorageProperties properties = new PostImageStorageProperties();
        properties.setStorageType("local");
        properties.setPublicBaseUrl("https://api.cubing-hub.com/uploads");

        PostImageStorageService storageService = config.postImageStorageService(properties);

        assertThat(storageService).isInstanceOf(UnavailablePostImageStorageService.class);
    }

    @Test
    @DisplayName("storageType이 local인데 publicBaseUrl이 없으면 unavailable storage를 반환한다")
    void should_return_unavailable_storage_when_public_base_url_is_blank_for_local_storage() {
        PostImageStorageProperties properties = new PostImageStorageProperties();
        properties.setStorageType("local");
        properties.setLocalRootPath("/tmp/cubing-hub-post-images");

        PostImageStorageService storageService = config.postImageStorageService(properties);

        assertThat(storageService).isInstanceOf(UnavailablePostImageStorageService.class);
    }
}
