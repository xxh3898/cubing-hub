package com.cubinghub.domain.post;

import com.cubinghub.domain.post.dto.PostListItemResponse;

import java.util.List;

public interface PostRepositoryCustom {
    List<PostListItemResponse> search(String keyword, String author);
}
