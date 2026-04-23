package com.cubinghub.domain.post.storage;

public record StoredPostImage(
        String objectKey,
        String imageUrl,
        String originalFileName,
        String contentType,
        long fileSizeBytes
) {
}
