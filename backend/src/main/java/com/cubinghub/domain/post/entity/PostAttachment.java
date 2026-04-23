package com.cubinghub.domain.post.entity;

import com.cubinghub.common.BaseTimeEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@Table(name = "post_attachments", indexes = {
        @Index(name = "idx_post_attachment_post_id", columnList = "post_id")
})
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PostAttachment extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id", nullable = false, foreignKey = @ForeignKey(name = "fk_post_attachment_post"))
    private Post post;

    @NotBlank
    @Column(name = "object_key", nullable = false, length = 512)
    private String objectKey;

    @NotBlank
    @Column(name = "image_url", nullable = false, length = 1000)
    private String imageUrl;

    @NotBlank
    @Column(name = "original_file_name", nullable = false, length = 255)
    private String originalFileName;

    @NotBlank
    @Column(name = "content_type", nullable = false, length = 100)
    private String contentType;

    @NotNull
    @PositiveOrZero
    @Column(name = "file_size_bytes", nullable = false)
    private Long fileSizeBytes;

    @NotNull
    @PositiveOrZero
    @Column(name = "display_order", nullable = false)
    private Integer displayOrder;

    @Builder
    public PostAttachment(
            Post post,
            String objectKey,
            String imageUrl,
            String originalFileName,
            String contentType,
            Long fileSizeBytes,
            Integer displayOrder
    ) {
        this.post = post;
        this.objectKey = objectKey;
        this.imageUrl = imageUrl;
        this.originalFileName = originalFileName;
        this.contentType = contentType;
        this.fileSizeBytes = fileSizeBytes;
        this.displayOrder = displayOrder;
    }

    public void updateDisplayOrder(int displayOrder) {
        this.displayOrder = displayOrder;
    }
}
