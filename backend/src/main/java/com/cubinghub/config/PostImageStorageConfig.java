package com.cubinghub.config;

import com.cubinghub.domain.post.storage.PostImageStorageService;
import com.cubinghub.domain.post.storage.S3PostImageStorageService;
import com.cubinghub.domain.post.storage.UnavailablePostImageStorageService;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.StringUtils;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;

@Configuration
@EnableConfigurationProperties(PostImageStorageProperties.class)
public class PostImageStorageConfig {

    @Bean
    public PostImageStorageService postImageStorageService(PostImageStorageProperties properties) {
        if (!StringUtils.hasText(properties.getBucket()) || !StringUtils.hasText(properties.getRegion())) {
            return new UnavailablePostImageStorageService();
        }

        S3Client s3Client = S3Client.builder()
                .region(Region.of(properties.getRegion()))
                .build();

        return new S3PostImageStorageService(s3Client, properties);
    }
}
