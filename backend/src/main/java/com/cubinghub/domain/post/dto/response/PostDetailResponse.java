package com.cubinghub.domain.post.dto.response;

import com.cubinghub.domain.post.entity.Post;
import com.cubinghub.domain.post.entity.PostCategory;
import java.util.List;
import lombok.Getter;

import java.time.Instant;

@Getter
public class PostDetailResponse {

    private final Long id;
    private final PostCategory category;
    private final String title;
    private final String content;
    private final String authorNickname;
    private final Integer viewCount;
    private final List<PostAttachmentResponse> attachments;
    private final Instant createdAt;
    private final Instant updatedAt;

    public PostDetailResponse(Long id, PostCategory category, String title, String content, String authorNickname,
                              Integer viewCount, List<PostAttachmentResponse> attachments, Instant createdAt, Instant updatedAt) {
        this.id = id;
        this.category = category;
        this.title = title;
        this.content = content;
        this.authorNickname = authorNickname;
        this.viewCount = viewCount;
        this.attachments = attachments;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public static PostDetailResponse from(Post post, List<PostAttachmentResponse> attachments) {
        return new PostDetailResponse(
                post.getId(),
                post.getCategory(),
                post.getTitle(),
                post.getContent(),
                post.getUser().getNickname(),
                post.getViewCount(),
                attachments,
                post.getCreatedAt(),
                post.getUpdatedAt()
        );
    }
}
