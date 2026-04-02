package com.cubinghub.domain.post.dto;

import com.cubinghub.domain.post.PostCategory;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
public class PostListItemResponse {

    private final Long id;
    private final PostCategory category;
    private final String title;
    private final String authorNickname;
    private final Integer viewCount;
    private final LocalDateTime createdAt;

    public PostListItemResponse(Long id, PostCategory category, String title, String authorNickname, Integer viewCount,
                                LocalDateTime createdAt) {
        this.id = id;
        this.category = category;
        this.title = title;
        this.authorNickname = authorNickname;
        this.viewCount = viewCount;
        this.createdAt = createdAt;
    }
}
