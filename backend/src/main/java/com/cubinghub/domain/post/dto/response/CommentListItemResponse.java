package com.cubinghub.domain.post.dto.response;

import com.cubinghub.domain.post.entity.Comment;
import java.time.Instant;
import lombok.Getter;

@Getter
public class CommentListItemResponse {

    private final Long id;
    private final String authorNickname;
    private final String content;
    private final Instant createdAt;

    public CommentListItemResponse(Long id, String authorNickname, String content, Instant createdAt) {
        this.id = id;
        this.authorNickname = authorNickname;
        this.content = content;
        this.createdAt = createdAt;
    }

    public static CommentListItemResponse from(Comment comment) {
        return new CommentListItemResponse(
                comment.getId(),
                comment.getUser().getNickname(),
                comment.getContent(),
                comment.getCreatedAt()
        );
    }
}
