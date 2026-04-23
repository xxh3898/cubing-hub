package com.cubinghub.domain.post.storage;

import org.springframework.web.multipart.MultipartFile;

public class UnavailablePostImageStorageService implements PostImageStorageService {

    @Override
    public StoredPostImage upload(MultipartFile file) {
        throw new IllegalStateException("게시글 이미지 저장소가 설정되지 않았습니다.");
    }

    @Override
    public void delete(String objectKey) {
        throw new IllegalStateException("게시글 이미지 저장소가 설정되지 않았습니다.");
    }
}
