package com.cubinghub.domain.post.repository;

import com.cubinghub.domain.post.dto.response.PostListItemResponse;

import java.util.List;

public interface PostRepositoryCustom {
    List<PostListItemResponse> search(String keyword, String author);
}
