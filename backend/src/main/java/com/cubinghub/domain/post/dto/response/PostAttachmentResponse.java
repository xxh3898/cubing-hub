package com.cubinghub.domain.post.dto.response;

import com.cubinghub.domain.post.entity.PostAttachment;
import lombok.Getter;

@Getter
public class PostAttachmentResponse {

    private final Long id;
    private final String imageUrl;
    private final String originalFileName;
    private final Integer displayOrder;

    public PostAttachmentResponse(Long id, String imageUrl, String originalFileName, Integer displayOrder) {
        this.id = id;
        this.imageUrl = imageUrl;
        this.originalFileName = originalFileName;
        this.displayOrder = displayOrder;
    }

    public static PostAttachmentResponse from(PostAttachment attachment) {
        return new PostAttachmentResponse(
                attachment.getId(),
                attachment.getImageUrl(),
                attachment.getOriginalFileName(),
                attachment.getDisplayOrder()
        );
    }
}
