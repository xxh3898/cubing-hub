package com.cubinghub.domain.post;

import com.cubinghub.domain.user.User;
import com.cubinghub.common.BaseTimeEntity;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@Table(name = "posts", indexes = {
        @Index(name = "idx_post_category", columnList = "category"),
        @Index(name = "idx_post_user_id", columnList = "user_id")
})
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Post extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, foreignKey = @ForeignKey(name = "fk_post_user"))
    private User user;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private PostCategory category;

    @NotBlank
    @Size(max = 100)
    @Column(nullable = false, length = 100)
    private String title;

    @NotBlank
    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    @NotNull
    @PositiveOrZero
    @Column(nullable = false)
    private Integer viewCount;

    @Builder
    public Post(User user, PostCategory category, String title, String content, Integer viewCount) {
        this.user = user;
        this.category = category;
        this.title = title;
        this.content = content;
        this.viewCount = viewCount != null ? viewCount : 0;
    }
}
