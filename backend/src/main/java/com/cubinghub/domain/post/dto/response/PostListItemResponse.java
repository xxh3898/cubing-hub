package com.cubinghub.domain.post.dto.response;

import com.cubinghub.domain.post.entity.PostCategory;
import lombok.Getter;

import java.time.Instant;

@Getter
public class PostListItemResponse {

    private final Long id;
    private final PostCategory category;
    private final String title;
    private final String authorNickname;
    private final Integer viewCount;
    private final Instant createdAt;

    public PostListItemResponse(Long id, PostCategory category, String title, String authorNickname, Integer viewCount,
                                Instant createdAt) {
        this.id = id;
        this.category = category;
        this.title = title;
        this.authorNickname = authorNickname;
        this.viewCount = viewCount;
        this.createdAt = createdAt;
    }
}
