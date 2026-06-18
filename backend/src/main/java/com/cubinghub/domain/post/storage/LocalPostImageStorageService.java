package com.cubinghub.domain.post.storage;

import com.cubinghub.common.exception.CustomApiException;
import com.cubinghub.config.PostImageStorageProperties;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.util.Locale;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

public class LocalPostImageStorageService implements PostImageStorageService {
    private static final String IMAGE_UPLOAD_UNAVAILABLE_MESSAGE = "이미지 업로드 서비스에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.";
    private static final String DEFAULT_CONTENT_TYPE = "application/octet-stream";

    private final PostImageStorageProperties properties;
    private final Path rootPath;

    public LocalPostImageStorageService(PostImageStorageProperties properties) {
        this.properties = properties;
        this.rootPath = Path.of(properties.getLocalRootPath()).toAbsolutePath().normalize();
    }

    @Override
    public StoredPostImage upload(MultipartFile file) {
        String originalFilename = file.getOriginalFilename();
        String objectKey = buildObjectKey(originalFilename);
        Path targetPath = resolveObjectPath(objectKey);

        try {
            Files.createDirectories(targetPath.getParent());
            try (InputStream inputStream = file.getInputStream()) {
                Files.copy(inputStream, targetPath, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException | RuntimeException ex) {
            throw new CustomApiException(IMAGE_UPLOAD_UNAVAILABLE_MESSAGE, HttpStatus.SERVICE_UNAVAILABLE);
        }

        return new StoredPostImage(
                objectKey,
                buildImageUrl(objectKey),
                originalFilename == null ? "" : originalFilename,
                file.getContentType() == null ? DEFAULT_CONTENT_TYPE : file.getContentType(),
                file.getSize()
        );
    }

    @Override
    public void delete(String objectKey) {
        try {
            Files.deleteIfExists(resolveObjectPath(objectKey));
        } catch (IOException | RuntimeException ex) {
            throw new CustomApiException(IMAGE_UPLOAD_UNAVAILABLE_MESSAGE, HttpStatus.SERVICE_UNAVAILABLE);
        }
    }

    private String buildObjectKey(String originalFilename) {
        LocalDate today = LocalDate.now();
        return properties.getKeyPrefix()
                + "/"
                + today.getYear()
                + "/"
                + String.format(Locale.ROOT, "%02d", today.getMonthValue())
                + "/"
                + String.format(Locale.ROOT, "%02d", today.getDayOfMonth())
                + "/"
                + UUID.randomUUID()
                + extractExtension(originalFilename);
    }

    private Path resolveObjectPath(String objectKey) {
        if (!StringUtils.hasText(objectKey)) {
            throw new CustomApiException(IMAGE_UPLOAD_UNAVAILABLE_MESSAGE, HttpStatus.SERVICE_UNAVAILABLE);
        }

        Path resolvedPath = rootPath.resolve(objectKey).normalize();
        if (!resolvedPath.startsWith(rootPath)) {
            throw new CustomApiException(IMAGE_UPLOAD_UNAVAILABLE_MESSAGE, HttpStatus.SERVICE_UNAVAILABLE);
        }

        return resolvedPath;
    }

    private String buildImageUrl(String objectKey) {
        return properties.getPublicBaseUrl().replaceAll("/+$", "") + "/" + objectKey;
    }

    private String extractExtension(String originalFilename) {
        if (!StringUtils.hasText(originalFilename) || !originalFilename.contains(".")) {
            return "";
        }

        return originalFilename.substring(originalFilename.lastIndexOf('.')).toLowerCase(Locale.ROOT);
    }
}
