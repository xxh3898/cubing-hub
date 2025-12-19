package com.cube.cube_server.dto;

import com.cube.cube_server.domain.Post;
import lombok.*;

import java.time.LocalDateTime;

public class PostDto {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Create {
        private String title;
        private String content;

        public Post toEntity() {
            return Post.builder()
                    .title(title)
                    .content(content)
                    .build();
        }
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Update {
        private String title;
        private String content;
    }

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Response {
        private Long id;
        private String title;
        private String content;
        private String author;
        private String authorId;
        private LocalDateTime createTime;

        public static Response of(Post post) {
            return Response.builder()
                    .id(post.getId())
                    .title(post.getTitle())
                    .content(post.getContent())
                    .author(post.getAuthor())
                    .authorId(post.getAuthorId())
                    .createTime(post.getCreateTime())
                    .build();
        }
    }
}