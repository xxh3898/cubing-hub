package com.cubinghub.config;

import static org.assertj.core.api.Assertions.assertThat;

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
    void should_return_s3_storage_when_bucket_and_region_are_present() {
        PostImageStorageProperties properties = new PostImageStorageProperties();
        properties.setBucket("cubinghub-images");
        properties.setRegion("ap-northeast-2");

        PostImageStorageService storageService = config.postImageStorageService(properties);

        assertThat(storageService).isInstanceOf(S3PostImageStorageService.class);
    }
}
