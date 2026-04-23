package com.cubinghub.domain.post.storage;

import com.cubinghub.common.exception.CustomApiException;
import com.cubinghub.config.PostImageStorageProperties;
import java.io.IOException;
import java.time.LocalDate;
import java.util.Locale;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

@RequiredArgsConstructor
public class S3PostImageStorageService implements PostImageStorageService {
    private static final String IMAGE_UPLOAD_UNAVAILABLE_MESSAGE = "이미지 업로드 서비스에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.";

    private final S3Client s3Client;
    private final PostImageStorageProperties properties;

    @Override
    public StoredPostImage upload(MultipartFile file) {
        String originalFilename = file.getOriginalFilename();
        String extension = extractExtension(originalFilename);
        LocalDate today = LocalDate.now();
        String objectKey = properties.getKeyPrefix()
                + "/"
                + today.getYear()
                + "/"
                + String.format(Locale.ROOT, "%02d", today.getMonthValue())
                + "/"
                + String.format(Locale.ROOT, "%02d", today.getDayOfMonth())
                + "/"
                + UUID.randomUUID()
                + extension;

        PutObjectRequest request = PutObjectRequest.builder()
                .bucket(properties.getBucket())
                .key(objectKey)
                .contentType(file.getContentType())
                .build();

        try {
            s3Client.putObject(request, RequestBody.fromInputStream(file.getInputStream(), file.getSize()));
        } catch (IOException | RuntimeException ex) {
            throw new CustomApiException(IMAGE_UPLOAD_UNAVAILABLE_MESSAGE, HttpStatus.SERVICE_UNAVAILABLE);
        }

        return new StoredPostImage(
                objectKey,
                buildImageUrl(objectKey),
                originalFilename == null ? "" : originalFilename,
                file.getContentType() == null ? "application/octet-stream" : file.getContentType(),
                file.getSize()
        );
    }

    @Override
    public void delete(String objectKey) {
        s3Client.deleteObject(DeleteObjectRequest.builder()
                .bucket(properties.getBucket())
                .key(objectKey)
                .build());
    }

    private String buildImageUrl(String objectKey) {
        if (StringUtils.hasText(properties.getPublicBaseUrl())) {
            return properties.getPublicBaseUrl().replaceAll("/+$", "") + "/" + objectKey;
        }

        return "https://%s.s3.%s.amazonaws.com/%s".formatted(
                properties.getBucket(),
                properties.getRegion(),
                objectKey
        );
    }

    private String extractExtension(String originalFilename) {
        if (!StringUtils.hasText(originalFilename) || !originalFilename.contains(".")) {
            return "";
        }

        return originalFilename.substring(originalFilename.lastIndexOf('.')).toLowerCase(Locale.ROOT);
    }
}
