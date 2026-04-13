package com.cubinghub.domain.post.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.cubinghub.domain.post.dto.response.PostListItemResponse;
import com.cubinghub.domain.post.entity.Post;
import com.cubinghub.domain.post.entity.PostCategory;
import com.cubinghub.domain.user.entity.User;
import com.cubinghub.domain.user.entity.UserRole;
import com.cubinghub.domain.user.entity.UserStatus;
import com.cubinghub.domain.user.repository.UserRepository;
import com.cubinghub.integration.JpaIntegrationTest;
import jakarta.persistence.EntityManager;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

@DisplayName("PostRepository 검색 통합 테스트")
class PostRepositorySearchIntegrationTest extends JpaIntegrationTest {

    @Autowired
    private PostRepository postRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    @DisplayName("키워드와 작성자 조건이 있으면 제목/본문과 닉네임을 대소문자 구분 없이 함께 필터링한다")
    void should_filter_posts_case_insensitively_when_keyword_and_author_are_provided() {
        User cubeAuthor = saveUser("cube-author@test.com", "CubeAuthor");
        User otherUser = saveUser("other-user@test.com", "OtherUser");

        savePost(cubeAuthor, PostCategory.FREE, "Cube Practice Notes", "Detailed OLL drill notes");
        savePost(cubeAuthor, PostCategory.FREE, "Weekly Journal", "Cube session summary");
        savePost(otherUser, PostCategory.FREE, "Cube Review", "Review written by another user");

        List<PostListItemResponse> result = postRepository.search("cUbE", "author");

        assertThat(result).hasSize(2);
        assertThat(result).extracting(PostListItemResponse::getTitle)
                .containsExactly("Weekly Journal", "Cube Practice Notes");
        assertThat(result).extracting(PostListItemResponse::getAuthorNickname)
                .containsOnly("CubeAuthor");
    }

    @Test
    @DisplayName("검색 조건이 없으면 최신 작성 시각 순으로 조회하고 같은 시각이면 ID 역순으로 정렬한다")
    void should_order_posts_by_created_at_desc_and_id_desc_when_no_filters_are_provided() {
        User user = saveUser("order-user@test.com", "OrderUser");

        Post oldest = savePost(user, PostCategory.FREE, "Oldest", "content-1");
        Post sameTimestampLowId = savePost(user, PostCategory.FREE, "Same Timestamp Low", "content-2");
        Post sameTimestampHighId = savePost(user, PostCategory.FREE, "Same Timestamp High", "content-3");
        Post newest = savePost(user, PostCategory.FREE, "Newest", "content-4");

        LocalDateTime baseTime = LocalDateTime.of(2026, 4, 13, 10, 0, 0);
        updatePostTimestamps(oldest.getId(), baseTime.minusMinutes(5));
        updatePostTimestamps(sameTimestampLowId.getId(), baseTime);
        updatePostTimestamps(sameTimestampHighId.getId(), baseTime);
        updatePostTimestamps(newest.getId(), baseTime.plusMinutes(5));

        List<PostListItemResponse> result = postRepository.search(null, null);

        assertThat(result).extracting(PostListItemResponse::getTitle)
                .containsExactly("Newest", "Same Timestamp High", "Same Timestamp Low", "Oldest");
    }

    @Test
    @DisplayName("작성자 조건만 있으면 해당 닉네임이 포함된 게시글만 조회한다")
    void should_filter_posts_by_author_when_only_author_is_provided() {
        User cubeAuthor = saveUser("cube-filter@test.com", "CubeMaster");
        User otherUser = saveUser("other-filter@test.com", "TimerUser");

        savePost(cubeAuthor, PostCategory.FREE, "Cube Tips", "content-1");
        savePost(otherUser, PostCategory.NOTICE, "Timer Setup", "content-2");

        List<PostListItemResponse> result = postRepository.search(null, "master");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getTitle()).isEqualTo("Cube Tips");
        assertThat(result.get(0).getAuthorNickname()).isEqualTo("CubeMaster");
    }

    @Test
    @DisplayName("키워드 조건만 있으면 제목과 본문에서 게시글을 검색한다")
    void should_filter_posts_by_title_and_content_when_only_keyword_is_provided() {
        User searchUser = saveUser("keyword-user@test.com", "KeywordUser");

        savePost(searchUser, PostCategory.FREE, "Cube Basics", "first content");
        savePost(searchUser, PostCategory.NOTICE, "Weekly Notes", "Cube memo and practice plan");
        savePost(searchUser, PostCategory.FREE, "Timer Setup", "Stackmat setting guide");

        List<PostListItemResponse> result = postRepository.search("cube", null);

        assertThat(result).hasSize(2);
        assertThat(result).extracting(PostListItemResponse::getTitle)
                .containsExactlyInAnyOrder("Cube Basics", "Weekly Notes");
    }

    private User saveUser(String email, String nickname) {
        return userRepository.save(User.builder()
                .email(email)
                .password("password")
                .nickname(nickname)
                .role(UserRole.ROLE_USER)
                .status(UserStatus.ACTIVE)
                .mainEvent("3x3x3")
                .build());
    }

    private Post savePost(User user, PostCategory category, String title, String content) {
        return postRepository.save(Post.builder()
                .user(user)
                .category(category)
                .title(title)
                .content(content)
                .build());
    }

    private void updatePostTimestamps(Long postId, LocalDateTime createdAt) {
        entityManager.flush();
        jdbcTemplate.update(
                "UPDATE posts SET created_at = ?, updated_at = ? WHERE id = ?",
                Timestamp.valueOf(createdAt),
                Timestamp.valueOf(createdAt),
                postId
        );
        entityManager.clear();
    }
}
