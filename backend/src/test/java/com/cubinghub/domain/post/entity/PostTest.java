package com.cubinghub.domain.post.entity;

import static org.assertj.core.api.Assertions.assertThat;

import com.cubinghub.domain.user.entity.User;
import com.cubinghub.domain.user.entity.UserRole;
import com.cubinghub.domain.user.entity.UserStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("Post 엔티티 단위 테스트")
class PostTest {

    @Test
    @DisplayName("viewCount가 null이면 기본값으로 0을 사용한다")
    void should_default_view_count_to_zero_when_view_count_is_null() {
        Post post = Post.builder()
                .user(createUser())
                .category(PostCategory.FREE)
                .title("제목")
                .content("본문")
                .viewCount(null)
                .build();

        assertThat(post.getViewCount()).isEqualTo(0);
    }

    @Test
    @DisplayName("viewCount가 주어지면 그 값을 유지한다")
    void should_keep_explicit_view_count_when_view_count_is_provided() {
        Post post = Post.builder()
                .user(createUser())
                .category(PostCategory.NOTICE)
                .title("제목")
                .content("본문")
                .viewCount(7)
                .build();

        assertThat(post.getViewCount()).isEqualTo(7);
    }

    private User createUser() {
        return User.builder()
                .email("post-test@cubinghub.com")
                .password("encodedPassword")
                .nickname("PostTester")
                .role(UserRole.ROLE_USER)
                .status(UserStatus.ACTIVE)
                .mainEvent("3x3x3")
                .build();
    }
}
