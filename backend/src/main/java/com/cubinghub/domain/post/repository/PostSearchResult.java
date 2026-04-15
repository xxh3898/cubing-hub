package com.cubinghub.domain.post.repository;

import com.cubinghub.domain.post.dto.response.PostListItemResponse;
import java.util.List;
import lombok.Getter;

@Getter
public class PostSearchResult {

    private final List<PostListItemResponse> items;
    private final Long totalElements;

    public PostSearchResult(List<PostListItemResponse> items, Long totalElements) {
        this.items = items;
        this.totalElements = totalElements;
    }
}
