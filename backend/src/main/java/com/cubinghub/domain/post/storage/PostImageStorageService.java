package com.cubinghub.domain.post.storage;

import org.springframework.web.multipart.MultipartFile;

public interface PostImageStorageService {

    StoredPostImage upload(MultipartFile file);

    void delete(String objectKey);
}
