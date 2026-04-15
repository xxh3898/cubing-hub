package com.cubinghub.domain.post;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.cubinghub.domain.post.dto.request.CommentCreateRequest;
import com.cubinghub.domain.post.entity.Comment;
import com.cubinghub.domain.post.entity.Post;
import com.cubinghub.domain.post.entity.PostCategory;
import com.cubinghub.domain.post.repository.CommentRepository;
import com.cubinghub.domain.post.repository.PostRepository;
import com.cubinghub.domain.user.entity.User;
import com.cubinghub.domain.user.entity.UserRole;
import com.cubinghub.domain.user.entity.UserStatus;
import com.cubinghub.domain.user.repository.UserRepository;
import com.cubinghub.integration.JpaIntegrationTest;
import com.cubinghub.security.JwtTokenProvider;
import com.cubinghub.support.TestFixtures;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc
@DisplayName("CommentController 통합 테스트")
class CommentControllerIntegrationTest extends JpaIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PostRepository postRepository;

    @Autowired
    private CommentRepository commentRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private EntityManager entityManager;

    private User authorUser;
    private User otherUser;
    private User adminUser;
    private Post savedPost;
    private String authorAccessToken;
    private String otherAccessToken;
    private String adminAccessToken;

    @BeforeEach
    void setUp() {
        authorUser = saveUser("author@cubinghub.com", "Author", UserRole.ROLE_USER);
        otherUser = saveUser("other@cubinghub.com", "OtherUser", UserRole.ROLE_USER);
        adminUser = saveUser("admin@cubinghub.com", "AdminUser", UserRole.ROLE_ADMIN);
        savedPost = savePost(authorUser, PostCategory.FREE, "게시글 제목", "게시글 본문");

        authorAccessToken = TestFixtures.generateAccessToken(jwtTokenProvider, authorUser);
        otherAccessToken = TestFixtures.generateAccessToken(jwtTokenProvider, otherUser);
        adminAccessToken = TestFixtures.generateAccessToken(jwtTokenProvider, adminUser);
    }

    @Test
    @DisplayName("댓글 목록 조회 요청이 오면 최신순 페이지 메타데이터를 반환한다")
    void should_return_paginated_comments_when_comment_list_is_requested() throws Exception {
        saveComment(savedPost, authorUser, "첫 댓글");
        saveComment(savedPost, otherUser, "둘째 댓글");

        mockMvc.perform(get("/api/posts/{postId}/comments", savedPost.getId())
                        .param("page", "1")
                        .param("size", "5")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("댓글 목록을 조회했습니다."))
                .andExpect(jsonPath("$.data.items.length()").value(2))
                .andExpect(jsonPath("$.data.items[0].content").value("둘째 댓글"))
                .andExpect(jsonPath("$.data.page").value(1))
                .andExpect(jsonPath("$.data.size").value(5))
                .andExpect(jsonPath("$.data.totalElements").value(2))
                .andExpect(jsonPath("$.data.totalPages").value(1))
                .andExpect(jsonPath("$.data.hasNext").value(false))
                .andExpect(jsonPath("$.data.hasPrevious").value(false));
    }

    @Test
    @DisplayName("인증된 사용자가 유효한 댓글 생성 요청을 보내면 댓글을 저장한다")
    void should_create_comment_when_authenticated_user_submits_valid_request() throws Exception {
        CommentCreateRequest request = new CommentCreateRequest("댓글 본문입니다.");

        mockMvc.perform(post("/api/posts/{postId}/comments", savedPost.getId())
                        .header("Authorization", "Bearer " + authorAccessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.message").value("댓글이 생성되었습니다."))
                .andExpect(jsonPath("$.data.id").exists());

        entityManager.flush();
        entityManager.clear();

        assertThat(commentRepository.findAll()).hasSize(1);
        Comment savedComment = commentRepository.findAll().get(0);
        assertThat(savedComment.getPost().getId()).isEqualTo(savedPost.getId());
        assertThat(savedComment.getUser().getId()).isEqualTo(authorUser.getId());
        assertThat(savedComment.getContent()).isEqualTo("댓글 본문입니다.");
    }

    @Test
    @DisplayName("인증 없이 댓글 생성 요청을 보내면 401을 반환한다")
    void should_return_unauthorized_when_creating_comment_without_authentication() throws Exception {
        mockMvc.perform(post("/api/posts/{postId}/comments", savedPost.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CommentCreateRequest("댓글"))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("인증이 필요합니다."));
    }

    @Test
    @DisplayName("댓글 생성 요청이 유효하지 않으면 400을 반환한다")
    void should_return_bad_request_when_creating_comment_with_invalid_request() throws Exception {
        mockMvc.perform(post("/api/posts/{postId}/comments", savedPost.getId())
                        .header("Authorization", "Bearer " + authorAccessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CommentCreateRequest(""))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message", containsString("잘못된 입력값입니다")));
    }

    @Test
    @DisplayName("작성자가 삭제 요청을 보내면 댓글이 제거된다")
    void should_delete_comment_when_author_requests_deletion() throws Exception {
        Comment savedComment = saveComment(savedPost, authorUser, "삭제 댓글");

        mockMvc.perform(delete("/api/posts/{postId}/comments/{commentId}", savedPost.getId(), savedComment.getId())
                        .header("Authorization", "Bearer " + authorAccessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("댓글이 삭제되었습니다."));

        entityManager.flush();
        entityManager.clear();

        assertThat(commentRepository.findById(savedComment.getId())).isEmpty();
    }

    @Test
    @DisplayName("관리자가 삭제 요청을 보내면 다른 사용자의 댓글도 제거할 수 있다")
    void should_delete_comment_when_admin_requests_deletion() throws Exception {
        Comment savedComment = saveComment(savedPost, authorUser, "삭제 댓글");

        mockMvc.perform(delete("/api/posts/{postId}/comments/{commentId}", savedPost.getId(), savedComment.getId())
                        .header("Authorization", "Bearer " + adminAccessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("댓글이 삭제되었습니다."));

        entityManager.flush();
        entityManager.clear();

        assertThat(commentRepository.findById(savedComment.getId())).isEmpty();
    }

    @Test
    @DisplayName("일반 사용자가 다른 사람의 댓글 삭제 요청을 보내면 403을 반환한다")
    void should_return_forbidden_when_non_author_deletes_comment() throws Exception {
        Comment savedComment = saveComment(savedPost, authorUser, "삭제 댓글");

        mockMvc.perform(delete("/api/posts/{postId}/comments/{commentId}", savedPost.getId(), savedComment.getId())
                        .header("Authorization", "Bearer " + otherAccessToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.message").value("댓글 삭제 권한이 없습니다."));
    }

    private User saveUser(String email, String nickname, UserRole role) {
        return userRepository.save(User.builder()
                .email(email)
                .password("password")
                .nickname(nickname)
                .role(role)
                .status(UserStatus.ACTIVE)
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

    private Comment saveComment(Post post, User user, String content) {
        return commentRepository.save(Comment.builder()
                .post(post)
                .user(user)
                .content(content)
                .build());
    }
}
