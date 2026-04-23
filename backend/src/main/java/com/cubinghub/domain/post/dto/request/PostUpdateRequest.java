package com.cubinghub.domain.post.dto.request;

import com.cubinghub.common.validation.InputConstraints;
import com.cubinghub.domain.post.entity.PostCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class PostUpdateRequest {

    @NotNull(message = "카테고리는 필수입니다.")
    private PostCategory category;

    @NotBlank(message = "제목은 필수입니다.")
    @Size(max = InputConstraints.POST_TITLE_MAX_LENGTH, message = "제목은 100자 이하여야 합니다.")
    private String title;

    @NotBlank(message = "내용은 필수입니다.")
    @Size(max = InputConstraints.POST_CONTENT_MAX_LENGTH, message = "내용은 2000자 이하여야 합니다.")
    private String content;

    private List<Long> retainedAttachmentIds;

    public PostUpdateRequest(PostCategory category, String title, String content) {
        this(category, title, content, null);
    }
}
