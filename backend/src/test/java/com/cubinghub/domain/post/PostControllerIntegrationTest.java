package com.cubinghub.domain.post;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.cubinghub.domain.post.dto.request.PostCreateRequest;
import com.cubinghub.domain.post.dto.request.PostUpdateRequest;
import com.cubinghub.domain.post.entity.Post;
import com.cubinghub.domain.post.entity.PostCategory;
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
@DisplayName("PostController 통합 테스트")
class PostControllerIntegrationTest extends JpaIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PostRepository postRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private EntityManager entityManager;

    private User authorUser;
    private User otherUser;
    private User adminUser;
    private String authorAccessToken;
    private String otherAccessToken;
    private String adminAccessToken;

    @BeforeEach
    void setUp() {
        authorUser = saveUser("author@cubinghub.com", "Author", UserRole.ROLE_USER);
        otherUser = saveUser("other@cubinghub.com", "OtherUser", UserRole.ROLE_USER);
        adminUser = saveUser("admin@cubinghub.com", "AdminUser", UserRole.ROLE_ADMIN);

        authorAccessToken = TestFixtures.generateAccessToken(jwtTokenProvider, authorUser);
        otherAccessToken = TestFixtures.generateAccessToken(jwtTokenProvider, otherUser);
        adminAccessToken = TestFixtures.generateAccessToken(jwtTokenProvider, adminUser);
    }

    @Test
    @DisplayName("인증된 사용자가 유효한 요청을 보내면 게시글을 저장한다")
    void should_create_post_when_authenticated_user_submits_valid_request() throws Exception {
        PostCreateRequest request = new PostCreateRequest(PostCategory.FREE, "첫 게시글", "게시글 본문입니다.");

        mockMvc.perform(post("/api/posts")
                        .header("Authorization", "Bearer " + authorAccessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.message").value("게시글이 생성되었습니다."))
                .andExpect(jsonPath("$.data.id").exists());

        entityManager.flush();
        entityManager.clear();

        assertThat(postRepository.findAll()).hasSize(1);
        Post savedPost = postRepository.findAll().get(0);
        assertThat(savedPost.getUser().getId()).isEqualTo(authorUser.getId());
        assertThat(savedPost.getTitle()).isEqualTo("첫 게시글");
        assertThat(savedPost.getViewCount()).isEqualTo(0);
    }

    @Test
    @DisplayName("인증 없이 게시글 생성 요청을 보내면 401을 반환한다")
    void should_return_unauthorized_when_creating_post_without_authentication() throws Exception {
        PostCreateRequest request = new PostCreateRequest(PostCategory.FREE, "첫 게시글", "게시글 본문입니다.");

        mockMvc.perform(post("/api/posts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("인증이 필요합니다."));
    }

    @Test
    @DisplayName("게시글 생성 요청이 유효하지 않으면 400을 반환한다")
    void should_return_bad_request_when_creating_post_with_invalid_request() throws Exception {
        PostCreateRequest request = new PostCreateRequest(PostCategory.FREE, "", "");

        mockMvc.perform(post("/api/posts")
                        .header("Authorization", "Bearer " + authorAccessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message", containsString("잘못된 입력값입니다")));
    }

    @Test
    @DisplayName("게시글 상세 조회 요청을 보내면 조회수가 증가한다")
    void should_increase_view_count_when_post_detail_is_requested() throws Exception {
        Post savedPost = savePost(authorUser, PostCategory.FREE, "상세 제목", "상세 본문");

        mockMvc.perform(get("/api/posts/{postId}", savedPost.getId())
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("게시글을 조회했습니다."))
                .andExpect(jsonPath("$.data.viewCount").value(1));

        entityManager.flush();
        entityManager.clear();

        Post foundPost = postRepository.findById(savedPost.getId()).orElseThrow();
        assertThat(foundPost.getViewCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("존재하지 않는 게시글 상세 조회는 404를 반환한다")
    void should_return_not_found_when_post_detail_does_not_exist() throws Exception {
        mockMvc.perform(get("/api/posts/{postId}", 99999L)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.message").value("게시글을 찾을 수 없습니다."));
    }

    @Test
    @DisplayName("작성자가 유효한 수정 요청을 보내면 게시글을 변경한다")
    void should_update_post_when_author_submits_valid_request() throws Exception {
        Post savedPost = savePost(authorUser, PostCategory.FREE, "수정 전 제목", "수정 전 본문");
        PostUpdateRequest request = new PostUpdateRequest(PostCategory.NOTICE, "수정 후 제목", "수정 후 본문");

        mockMvc.perform(put("/api/posts/{postId}", savedPost.getId())
                        .header("Authorization", "Bearer " + authorAccessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("게시글이 수정되었습니다."));

        entityManager.flush();
        entityManager.clear();

        Post updatedPost = postRepository.findById(savedPost.getId()).orElseThrow();
        assertThat(updatedPost.getCategory()).isEqualTo(PostCategory.NOTICE);
        assertThat(updatedPost.getTitle()).isEqualTo("수정 후 제목");
        assertThat(updatedPost.getContent()).isEqualTo("수정 후 본문");
    }

    @Test
    @DisplayName("관리자가 수정 요청을 보내면 다른 사용자의 게시글도 변경할 수 있다")
    void should_update_post_when_admin_submits_valid_request() throws Exception {
        Post savedPost = savePost(authorUser, PostCategory.FREE, "수정 전 제목", "수정 전 본문");
        PostUpdateRequest request = new PostUpdateRequest(PostCategory.FREE, "관리자 수정", "관리자 본문");

        mockMvc.perform(put("/api/posts/{postId}", savedPost.getId())
                        .header("Authorization", "Bearer " + adminAccessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("게시글이 수정되었습니다."));

        entityManager.flush();
        entityManager.clear();

        Post updatedPost = postRepository.findById(savedPost.getId()).orElseThrow();
        assertThat(updatedPost.getTitle()).isEqualTo("관리자 수정");
        assertThat(updatedPost.getContent()).isEqualTo("관리자 본문");
    }

    @Test
    @DisplayName("일반 사용자가 다른 사람의 게시글 수정 요청을 보내면 403을 반환한다")
    void should_return_forbidden_when_non_author_updates_post() throws Exception {
        Post savedPost = savePost(authorUser, PostCategory.FREE, "수정 전 제목", "수정 전 본문");
        PostUpdateRequest request = new PostUpdateRequest(PostCategory.FREE, "실패 제목", "실패 본문");

        mockMvc.perform(put("/api/posts/{postId}", savedPost.getId())
                        .header("Authorization", "Bearer " + otherAccessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("게시글 수정/삭제 권한이 없습니다."));
    }

    @Test
    @DisplayName("작성자가 삭제 요청을 보내면 게시글이 제거된다")
    void should_delete_post_when_author_requests_deletion() throws Exception {
        Post savedPost = savePost(authorUser, PostCategory.FREE, "삭제 대상", "삭제 본문");

        mockMvc.perform(delete("/api/posts/{postId}", savedPost.getId())
                        .header("Authorization", "Bearer " + authorAccessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("게시글이 삭제되었습니다."));

        entityManager.flush();
        entityManager.clear();

        assertThat(postRepository.findById(savedPost.getId())).isEmpty();
    }

    @Test
    @DisplayName("관리자가 삭제 요청을 보내면 다른 사용자의 게시글도 제거할 수 있다")
    void should_delete_post_when_admin_requests_deletion() throws Exception {
        Post savedPost = savePost(authorUser, PostCategory.FREE, "삭제 대상", "삭제 본문");

        mockMvc.perform(delete("/api/posts/{postId}", savedPost.getId())
                        .header("Authorization", "Bearer " + adminAccessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("게시글이 삭제되었습니다."));

        entityManager.flush();
        entityManager.clear();

        assertThat(postRepository.findById(savedPost.getId())).isEmpty();
    }

    @Test
    @DisplayName("일반 사용자가 다른 사람의 게시글 삭제 요청을 보내면 403을 반환한다")
    void should_return_forbidden_when_non_author_deletes_post() throws Exception {
        Post savedPost = savePost(authorUser, PostCategory.FREE, "삭제 대상", "삭제 본문");

        mockMvc.perform(delete("/api/posts/{postId}", savedPost.getId())
                        .header("Authorization", "Bearer " + otherAccessToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("게시글 수정/삭제 권한이 없습니다."));
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
}
