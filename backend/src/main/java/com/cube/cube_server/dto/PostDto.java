package com.cube.cube_server.dto;

import com.cube.cube_server.domain.Post;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
public class PostDto {
    private Long id;
    private String title;
    private String content;
    private String author;
    private String authorId;
    private LocalDateTime date;

    public PostDto(Post post) {
        this.id = post.getId();
        this.title = post.getTitle();
        this.content = post.getContent();
        this.author = post.getAuthor();

        if (post.getMember() != null) {
            this.authorId = post.getMember().getId();
        }

        this.date = post.getCreateTime();
    }
}