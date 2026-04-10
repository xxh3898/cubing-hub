package com.cubinghub.domain.post.dto;

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
    @Size(max = 100)
    private String title;

    @NotBlank
    private String content;
}
