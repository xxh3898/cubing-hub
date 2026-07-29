package com.cubinghub.config;

import static org.assertj.core.api.Assertions.assertThat;

import com.cubinghub.domain.post.storage.LocalPostImageStorageService;
import com.cubinghub.domain.post.storage.PostImageStorageService;
import com.cubinghub.domain.post.storage.UnavailablePostImageStorageService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("PostImageStorageConfig 단위 테스트")
class PostImageStorageConfigTest {

    private final PostImageStorageConfig config = new PostImageStorageConfig();

    @Test
    @DisplayName("로컬 설정이 있으면 local storage를 반환한다")
    void should_return_local_storage_when_local_settings_are_present() {
        PostImageStorageProperties properties = new PostImageStorageProperties();
        properties.setLocalRootPath("/tmp/cubing-hub-post-images");
        properties.setPublicBaseUrl("https://api.cubing-hub.com/uploads");

        PostImageStorageService storageService = config.postImageStorageService(properties);

        assertThat(storageService).isInstanceOf(LocalPostImageStorageService.class);
    }

    @Test
    @DisplayName("root path가 없으면 unavailable storage를 반환한다")
    void should_return_unavailable_storage_when_local_root_path_is_blank() {
        PostImageStorageProperties properties = new PostImageStorageProperties();
        properties.setPublicBaseUrl("https://api.cubing-hub.com/uploads");

        PostImageStorageService storageService = config.postImageStorageService(properties);

        assertThat(storageService).isInstanceOf(UnavailablePostImageStorageService.class);
    }

    @Test
    @DisplayName("publicBaseUrl이 없으면 unavailable storage를 반환한다")
    void should_return_unavailable_storage_when_public_base_url_is_blank() {
        PostImageStorageProperties properties = new PostImageStorageProperties();
        properties.setLocalRootPath("/tmp/cubing-hub-post-images");

        PostImageStorageService storageService = config.postImageStorageService(properties);

        assertThat(storageService).isInstanceOf(UnavailablePostImageStorageService.class);
    }
}
