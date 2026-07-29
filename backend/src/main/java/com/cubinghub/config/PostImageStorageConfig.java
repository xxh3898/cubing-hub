package com.cubinghub.config;

import com.cubinghub.domain.post.storage.LocalPostImageStorageService;
import com.cubinghub.domain.post.storage.PostImageStorageService;
import com.cubinghub.domain.post.storage.UnavailablePostImageStorageService;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.StringUtils;

@Configuration
@EnableConfigurationProperties(PostImageStorageProperties.class)
public class PostImageStorageConfig {

    @Bean
    public PostImageStorageService postImageStorageService(PostImageStorageProperties properties) {
        if (!StringUtils.hasText(properties.getLocalRootPath())
                || !StringUtils.hasText(properties.getPublicBaseUrl())) {
            return new UnavailablePostImageStorageService();
        }

        return new LocalPostImageStorageService(properties);
    }
}
