package com.cubinghub.domain.post.entity;

import com.cubinghub.common.BaseTimeEntity;
import com.cubinghub.domain.user.entity.User;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@Table(
        name = "post_views",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_post_view_post_user", columnNames = {"post_id", "user_id"})
        }
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PostView extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id", nullable = false, foreignKey = @ForeignKey(name = "fk_post_view_post"))
    private Post post;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, foreignKey = @ForeignKey(name = "fk_post_view_user"))
    private User user;

    @Builder
    public PostView(Post post, User user) {
        this.post = post;
        this.user = user;
    }
}
