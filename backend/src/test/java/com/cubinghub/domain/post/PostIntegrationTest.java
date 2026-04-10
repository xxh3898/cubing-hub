package com.cubinghub.domain.post.service;

import com.cubinghub.domain.post.dto.PostCreateRequest;
import com.cubinghub.domain.post.dto.PostUpdateRequest;
import com.cubinghub.domain.user.entity.User;
import com.cubinghub.domain.user.repository.UserRepository;
import com.cubinghub.domain.user.entity.UserRole;
import com.cubinghub.domain.user.entity.UserStatus;
import com.cubinghub.integration.RestDocsBaseTest;
import com.cubinghub.security.JwtTokenProvider;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.test.web.servlet.ResultActions;

import java.util.Collections;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.restdocs.mockmvc.MockMvcRestDocumentation.document;
import static org.springframework.restdocs.mockmvc.RestDocumentationRequestBuilders.delete;
import static org.springframework.restdocs.mockmvc.RestDocumentationRequestBuilders.get;
import static org.springframework.restdocs.mockmvc.RestDocumentationRequestBuilders.post;
import static org.springframework.restdocs.mockmvc.RestDocumentationRequestBuilders.put;
import static org.springframework.restdocs.payload.PayloadDocumentation.fieldWithPath;
import static org.springframework.restdocs.payload.PayloadDocumentation.requestFields;
import static org.springframework.restdocs.payload.PayloadDocumentation.responseFields;
import static org.springframework.restdocs.request.RequestDocumentation.parameterWithName;
import static org.springframework.restdocs.request.RequestDocumentation.pathParameters;
import static org.springframework.restdocs.request.RequestDocumentation.queryParameters;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class PostIntegrationTest extends RestDocsBaseTest {

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PostRepository postRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

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

        authorAccessToken = generateAccessToken(authorUser);
        otherAccessToken = generateAccessToken(otherUser);
        adminAccessToken = generateAccessToken(adminUser);
    }

    @Test
    @DisplayName("인증된 사용자는 게시글을 생성할 수 있다")
    void createPost() throws Exception {
        PostCreateRequest request = new PostCreateRequest(PostCategory.FREE, "첫 게시글", "게시글 본문입니다.");

        ResultActions result = mockMvc.perform(post("/api/posts")
                .header("Authorization", "Bearer " + authorAccessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)));

        result.andExpect(status().isCreated())
                .andDo(document("post/create",
                        requestFields(
                                fieldWithPath("category").description("게시판 카테고리 (`NOTICE`, `FREE`)"),
                                fieldWithPath("title").description("게시글 제목"),
                                fieldWithPath("content").description("게시글 본문")
                        )
                ));

        assertThat(postRepository.findAll()).hasSize(1);
        Post savedPost = postRepository.findAll().get(0);
        assertThat(savedPost.getUser().getId()).isEqualTo(authorUser.getId());
        assertThat(savedPost.getTitle()).isEqualTo("첫 게시글");
        assertThat(savedPost.getViewCount()).isEqualTo(0);
    }

    @Test
    @DisplayName("인증 없이 게시글을 생성할 수 없다")
    void createPostWithoutAuthentication() throws Exception {
        PostCreateRequest request = new PostCreateRequest(PostCategory.FREE, "첫 게시글", "게시글 본문입니다.");

        mockMvc.perform(post("/api/posts")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("게시글 목록은 공개 조회되며 키워드와 작성자 조건으로 검색할 수 있다")
    void getPosts() throws Exception {
        savePost(authorUser, PostCategory.FREE, "큐브 연습법", "OLL 연습 내용을 정리합니다.");
        savePost(otherUser, PostCategory.FREE, "대회 후기", "큐브 대회 후기와 기록");
        savePost(authorUser, PostCategory.NOTICE, "공지 제목", "운영 공지입니다.");

        ResultActions result = mockMvc.perform(get("/api/posts")
                .param("keyword", "큐브")
                .param("author", "Author")
                .accept(MediaType.APPLICATION_JSON));

        result.andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].title").value("큐브 연습법"))
                .andExpect(jsonPath("$[0].authorNickname").value("Author"))
                .andDo(document("post/list",
                        queryParameters(
                                parameterWithName("keyword").optional().description("제목/본문 키워드 검색어"),
                                parameterWithName("author").optional().description("작성자 닉네임 검색어")
                        ),
                        responseFields(
                                fieldWithPath("[].id").description("게시글 ID"),
                                fieldWithPath("[].category").description("게시판 카테고리"),
                                fieldWithPath("[].title").description("게시글 제목"),
                                fieldWithPath("[].authorNickname").description("작성자 닉네임"),
                                fieldWithPath("[].viewCount").description("조회수"),
                                fieldWithPath("[].createdAt").description("작성 시각")
                        )
                ));
    }

    @Test
    @DisplayName("게시글 상세 조회는 공개되며 조회 시 조회수가 증가한다")
    void getPostDetail() throws Exception {
        Post savedPost = savePost(authorUser, PostCategory.FREE, "상세 제목", "상세 본문");

        ResultActions result = mockMvc.perform(get("/api/posts/{postId}", savedPost.getId())
                .accept(MediaType.APPLICATION_JSON));

        result.andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(savedPost.getId()))
                .andExpect(jsonPath("$.title").value("상세 제목"))
                .andExpect(jsonPath("$.content").value("상세 본문"))
                .andExpect(jsonPath("$.authorNickname").value("Author"))
                .andExpect(jsonPath("$.viewCount").value(1))
                .andDo(document("post/detail",
                        pathParameters(
                                parameterWithName("postId").description("조회할 게시글 ID")
                        ),
                        responseFields(
                                fieldWithPath("id").description("게시글 ID"),
                                fieldWithPath("category").description("게시판 카테고리"),
                                fieldWithPath("title").description("게시글 제목"),
                                fieldWithPath("content").description("게시글 본문"),
                                fieldWithPath("authorNickname").description("작성자 닉네임"),
                                fieldWithPath("viewCount").description("조회수"),
                                fieldWithPath("createdAt").description("작성 시각"),
                                fieldWithPath("updatedAt").description("수정 시각")
                        )
                ));

        Post foundPost = postRepository.findById(savedPost.getId()).orElseThrow();
        assertThat(foundPost.getViewCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("작성자는 자신의 게시글을 수정할 수 있다")
    void updatePostByAuthor() throws Exception {
        Post savedPost = savePost(authorUser, PostCategory.FREE, "수정 전 제목", "수정 전 본문");
        PostUpdateRequest request = new PostUpdateRequest(PostCategory.NOTICE, "수정 후 제목", "수정 후 본문");

        mockMvc.perform(put("/api/posts/{postId}", savedPost.getId())
                .header("Authorization", "Bearer " + authorAccessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andDo(document("post/update",
                        pathParameters(
                                parameterWithName("postId").description("수정할 게시글 ID")
                        ),
                        requestFields(
                                fieldWithPath("category").description("수정할 게시판 카테고리"),
                                fieldWithPath("title").description("수정할 게시글 제목"),
                                fieldWithPath("content").description("수정할 게시글 본문")
                        )
                ));

        Post updatedPost = postRepository.findById(savedPost.getId()).orElseThrow();
        assertThat(updatedPost.getCategory()).isEqualTo(PostCategory.NOTICE);
        assertThat(updatedPost.getTitle()).isEqualTo("수정 후 제목");
        assertThat(updatedPost.getContent()).isEqualTo("수정 후 본문");
    }

    @Test
    @DisplayName("관리자는 다른 사용자의 게시글을 수정할 수 있다")
    void updatePostByAdmin() throws Exception {
        Post savedPost = savePost(authorUser, PostCategory.FREE, "수정 전 제목", "수정 전 본문");
        PostUpdateRequest request = new PostUpdateRequest(PostCategory.FREE, "관리자 수정", "관리자 본문");

        mockMvc.perform(put("/api/posts/{postId}", savedPost.getId())
                .header("Authorization", "Bearer " + adminAccessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());

        Post updatedPost = postRepository.findById(savedPost.getId()).orElseThrow();
        assertThat(updatedPost.getTitle()).isEqualTo("관리자 수정");
    }

    @Test
    @DisplayName("일반 사용자는 다른 사용자의 게시글을 수정할 수 없다")
    void updatePostForbidden() throws Exception {
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
    @DisplayName("작성자는 자신의 게시글을 삭제할 수 있다")
    void deletePostByAuthor() throws Exception {
        Post savedPost = savePost(authorUser, PostCategory.FREE, "삭제 대상", "삭제 본문");

        mockMvc.perform(delete("/api/posts/{postId}", savedPost.getId())
                .header("Authorization", "Bearer " + authorAccessToken))
                .andExpect(status().isNoContent())
                .andDo(document("post/delete",
                        pathParameters(
                                parameterWithName("postId").description("삭제할 게시글 ID")
                        )
                ));

        assertThat(postRepository.findById(savedPost.getId())).isEmpty();
    }

    @Test
    @DisplayName("관리자는 다른 사용자의 게시글을 삭제할 수 있다")
    void deletePostByAdmin() throws Exception {
        Post savedPost = savePost(authorUser, PostCategory.FREE, "삭제 대상", "삭제 본문");

        mockMvc.perform(delete("/api/posts/{postId}", savedPost.getId())
                .header("Authorization", "Bearer " + adminAccessToken))
                .andExpect(status().isNoContent());

        assertThat(postRepository.findById(savedPost.getId())).isEmpty();
    }

    @Test
    @DisplayName("일반 사용자는 다른 사용자의 게시글을 삭제할 수 없다")
    void deletePostForbidden() throws Exception {
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

    private String generateAccessToken(User user) {
        UserDetails userDetails = org.springframework.security.core.userdetails.User.builder()
                .username(user.getEmail())
                .password("")
                .authorities(Collections.singletonList(() -> user.getRole().name()))
                .build();

        return jwtTokenProvider.generateAccessToken(userDetails);
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
