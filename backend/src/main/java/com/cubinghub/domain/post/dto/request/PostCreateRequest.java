package com.cubinghub.domain.post.dto.request;

import com.cubinghub.common.validation.InputConstraints;
import com.cubinghub.domain.post.entity.PostCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class PostCreateRequest {

    @NotNull
    private PostCategory category;

    @NotBlank
    @Size(max = InputConstraints.POST_TITLE_MAX_LENGTH, message = "제목은 100자 이하이어야 합니다.")
    private String title;

    @NotBlank
    @Size(max = InputConstraints.POST_CONTENT_MAX_LENGTH, message = "내용은 2000자 이하이어야 합니다.")
    private String content;
}
