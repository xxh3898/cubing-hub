package com.cubinghub.config;

import com.cubinghub.domain.post.storage.LocalPostImageStorageService;
import com.cubinghub.domain.post.storage.PostImageStorageService;
import com.cubinghub.domain.post.storage.S3PostImageStorageService;
import com.cubinghub.domain.post.storage.UnavailablePostImageStorageService;
import java.util.Locale;
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
        String storageType = properties.getStorageType() == null
                ? ""
                : properties.getStorageType().toLowerCase(Locale.ROOT);
        if ("local".equals(storageType)) {
            if (!StringUtils.hasText(properties.getLocalRootPath())
                    || !StringUtils.hasText(properties.getPublicBaseUrl())) {
                return new UnavailablePostImageStorageService();
            }

            return new LocalPostImageStorageService(properties);
        }

        if ("s3".equals(storageType)) {
            return createS3StorageService(properties);
        }

        if (!StringUtils.hasText(properties.getBucket()) || !StringUtils.hasText(properties.getRegion())) {
            return new UnavailablePostImageStorageService();
        }

        return createS3StorageService(properties);
    }

    private PostImageStorageService createS3StorageService(PostImageStorageProperties properties) {
        if (!StringUtils.hasText(properties.getBucket()) || !StringUtils.hasText(properties.getRegion())) {
            return new UnavailablePostImageStorageService();
        }

        S3Client s3Client = S3Client.builder()
                .region(Region.of(properties.getRegion()))
                .build();

        return new S3PostImageStorageService(s3Client, properties);
    }
}
