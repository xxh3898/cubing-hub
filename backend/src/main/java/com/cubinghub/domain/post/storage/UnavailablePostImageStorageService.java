package com.cubinghub.domain.post.storage;

import com.cubinghub.common.exception.CustomApiException;
import org.springframework.http.HttpStatus;
import org.springframework.web.multipart.MultipartFile;

public class UnavailablePostImageStorageService implements PostImageStorageService {
    private static final String IMAGE_UPLOAD_UNAVAILABLE_MESSAGE = "이미지 업로드 서비스에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.";

    @Override
    public StoredPostImage upload(MultipartFile file) {
        throw new CustomApiException(IMAGE_UPLOAD_UNAVAILABLE_MESSAGE, HttpStatus.SERVICE_UNAVAILABLE);
    }

    @Override
    public void delete(String objectKey) {
        throw new CustomApiException(IMAGE_UPLOAD_UNAVAILABLE_MESSAGE, HttpStatus.SERVICE_UNAVAILABLE);
    }
}
