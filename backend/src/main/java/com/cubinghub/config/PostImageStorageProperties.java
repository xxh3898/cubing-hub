package com.cubinghub.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@ConfigurationProperties(prefix = "post.images")
public class PostImageStorageProperties {

    private String bucket = "";
    private String region = "";
    private String keyPrefix = "community/posts";
    private String publicBaseUrl = "";
    private int maxFileCount = 5;
    private long maxFileSizeBytes = 10L * 1024L * 1024L;
    private long maxTotalSizeBytes = 30L * 1024L * 1024L;
}
