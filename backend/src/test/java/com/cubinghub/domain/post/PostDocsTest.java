package com.cubinghub.domain.post;

import com.cubinghub.domain.post.dto.request.PostCreateRequest;
import com.cubinghub.domain.post.dto.request.PostUpdateRequest;
import com.cubinghub.domain.post.entity.Post;
import com.cubinghub.domain.post.entity.PostCategory;
import com.cubinghub.domain.post.repository.PostRepository;
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
import org.springframework.restdocs.payload.JsonFieldType;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.test.web.servlet.ResultActions;

import java.util.Collections;

import static org.hamcrest.Matchers.nullValue;
import static org.hamcrest.Matchers.containsString;
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

class PostDocsTest extends RestDocsBaseTest {

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
    void should_create_post_when_authenticated_user_submits_valid_request() throws Exception {
        PostCreateRequest request = new PostCreateRequest(PostCategory.FREE, "첫 게시글", "게시글 본문입니다.");

        ResultActions result = mockMvc.perform(post("/api/posts")
                .header("Authorization", "Bearer " + authorAccessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)));

        result.andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value(201))
                .andExpect(jsonPath("$.message").value("게시글이 생성되었습니다."))
                .andExpect(jsonPath("$.data.id").exists())
                .andDo(document("post/create",
                        requestFields(
                                fieldWithPath("category").description("게시판 카테고리 (`NOTICE`, `FREE`)"),
                                fieldWithPath("title").description("게시글 제목"),
                                fieldWithPath("content").description("게시글 본문")
                        ),
                        responseFields(
                                fieldWithPath("status").type(JsonFieldType.NUMBER).description("HTTP 상태 코드"),
                                fieldWithPath("message").type(JsonFieldType.STRING).description("응답 메시지"),
                                fieldWithPath("data").type(JsonFieldType.OBJECT).description("생성된 리소스 정보"),
                                fieldWithPath("data.id").description("생성된 게시글 ID")
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
    void should_return_unauthorized_when_creating_post_without_authentication() throws Exception {
        PostCreateRequest request = new PostCreateRequest(PostCategory.FREE, "첫 게시글", "게시글 본문입니다.");

        mockMvc.perform(post("/api/posts")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
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
    @DisplayName("게시글 목록은 공개 조회되며 키워드와 작성자 조건으로 검색할 수 있다")
    void should_return_filtered_posts_when_keyword_and_author_are_provided() throws Exception {
        savePost(authorUser, PostCategory.FREE, "큐브 연습법", "OLL 연습 내용을 정리합니다.");
        savePost(otherUser, PostCategory.FREE, "대회 후기", "큐브 대회 후기와 기록");
        savePost(authorUser, PostCategory.NOTICE, "공지 제목", "운영 공지입니다.");

        ResultActions result = mockMvc.perform(get("/api/posts")
                .param("keyword", "큐브")
                .param("author", "Author")
                .accept(MediaType.APPLICATION_JSON));

        result.andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.message").value("게시글 목록을 조회했습니다."))
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].title").value("큐브 연습법"))
                .andExpect(jsonPath("$.data[0].authorNickname").value("Author"))
                .andDo(document("post/list",
                        queryParameters(
                                parameterWithName("keyword").optional().description("제목/본문 키워드 검색어"),
                                parameterWithName("author").optional().description("작성자 닉네임 검색어")
                        ),
                        responseFields(
                                fieldWithPath("status").type(JsonFieldType.NUMBER).description("HTTP 상태 코드"),
                                fieldWithPath("message").type(JsonFieldType.STRING).description("응답 메시지"),
                                fieldWithPath("data").type(JsonFieldType.ARRAY).description("게시글 목록"),
                                fieldWithPath("data[].id").description("게시글 ID"),
                                fieldWithPath("data[].category").description("게시판 카테고리"),
                                fieldWithPath("data[].title").description("게시글 제목"),
                                fieldWithPath("data[].authorNickname").description("작성자 닉네임"),
                                fieldWithPath("data[].viewCount").description("조회수"),
                                fieldWithPath("data[].createdAt").description("작성 시각")
                        )
                ));
    }

    @Test
    @DisplayName("게시글 상세 조회는 공개되며 조회 시 조회수가 증가한다")
    void should_increase_view_count_when_post_detail_is_requested() throws Exception {
        Post savedPost = savePost(authorUser, PostCategory.FREE, "상세 제목", "상세 본문");

        ResultActions result = mockMvc.perform(get("/api/posts/{postId}", savedPost.getId())
                .accept(MediaType.APPLICATION_JSON));

        result.andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.message").value("게시글을 조회했습니다."))
                .andExpect(jsonPath("$.data.id").value(savedPost.getId()))
                .andExpect(jsonPath("$.data.title").value("상세 제목"))
                .andExpect(jsonPath("$.data.content").value("상세 본문"))
                .andExpect(jsonPath("$.data.authorNickname").value("Author"))
                .andExpect(jsonPath("$.data.viewCount").value(1))
                .andDo(document("post/detail",
                        pathParameters(
                                parameterWithName("postId").description("조회할 게시글 ID")
                        ),
                        responseFields(
                                fieldWithPath("status").type(JsonFieldType.NUMBER).description("HTTP 상태 코드"),
                                fieldWithPath("message").type(JsonFieldType.STRING).description("응답 메시지"),
                                fieldWithPath("data").type(JsonFieldType.OBJECT).description("게시글 상세 정보"),
                                fieldWithPath("data.id").description("게시글 ID"),
                                fieldWithPath("data.category").description("게시판 카테고리"),
                                fieldWithPath("data.title").description("게시글 제목"),
                                fieldWithPath("data.content").description("게시글 본문"),
                                fieldWithPath("data.authorNickname").description("작성자 닉네임"),
                                fieldWithPath("data.viewCount").description("조회수"),
                                fieldWithPath("data.createdAt").description("작성 시각"),
                                fieldWithPath("data.updatedAt").description("수정 시각")
                        )
                ));

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
    @DisplayName("작성자는 자신의 게시글을 수정할 수 있다")
    void should_update_post_when_author_submits_valid_request() throws Exception {
        Post savedPost = savePost(authorUser, PostCategory.FREE, "수정 전 제목", "수정 전 본문");
        PostUpdateRequest request = new PostUpdateRequest(PostCategory.NOTICE, "수정 후 제목", "수정 후 본문");

        mockMvc.perform(put("/api/posts/{postId}", savedPost.getId())
                .header("Authorization", "Bearer " + authorAccessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.message").value("게시글이 수정되었습니다."))
                .andExpect(jsonPath("$.data").value(nullValue()))
                .andDo(document("post/update",
                        pathParameters(
                                parameterWithName("postId").description("수정할 게시글 ID")
                        ),
                        requestFields(
                                fieldWithPath("category").description("수정할 게시판 카테고리"),
                                fieldWithPath("title").description("수정할 게시글 제목"),
                                fieldWithPath("content").description("수정할 게시글 본문")
                        ),
                        responseFields(
                                fieldWithPath("status").type(JsonFieldType.NUMBER).description("HTTP 상태 코드"),
                                fieldWithPath("message").type(JsonFieldType.STRING).description("응답 메시지"),
                                fieldWithPath("data").type(JsonFieldType.NULL).description("추가 데이터 없음")
                        )
                ));

        Post updatedPost = postRepository.findById(savedPost.getId()).orElseThrow();
        assertThat(updatedPost.getCategory()).isEqualTo(PostCategory.NOTICE);
        assertThat(updatedPost.getTitle()).isEqualTo("수정 후 제목");
        assertThat(updatedPost.getContent()).isEqualTo("수정 후 본문");
    }

    @Test
    @DisplayName("관리자는 다른 사용자의 게시글을 수정할 수 있다")
    void should_update_post_when_admin_submits_valid_request() throws Exception {
        Post savedPost = savePost(authorUser, PostCategory.FREE, "수정 전 제목", "수정 전 본문");
        PostUpdateRequest request = new PostUpdateRequest(PostCategory.FREE, "관리자 수정", "관리자 본문");

        mockMvc.perform(put("/api/posts/{postId}", savedPost.getId())
                .header("Authorization", "Bearer " + adminAccessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("게시글이 수정되었습니다."));

        Post updatedPost = postRepository.findById(savedPost.getId()).orElseThrow();
        assertThat(updatedPost.getTitle()).isEqualTo("관리자 수정");
    }

    @Test
    @DisplayName("일반 사용자는 다른 사용자의 게시글을 수정할 수 없다")
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
    @DisplayName("작성자는 자신의 게시글을 삭제할 수 있다")
    void should_delete_post_when_author_requests_deletion() throws Exception {
        Post savedPost = savePost(authorUser, PostCategory.FREE, "삭제 대상", "삭제 본문");

        mockMvc.perform(delete("/api/posts/{postId}", savedPost.getId())
                .header("Authorization", "Bearer " + authorAccessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.message").value("게시글이 삭제되었습니다."))
                .andExpect(jsonPath("$.data").value(nullValue()))
                .andDo(document("post/delete",
                        pathParameters(
                                parameterWithName("postId").description("삭제할 게시글 ID")
                        ),
                        responseFields(
                                fieldWithPath("status").type(JsonFieldType.NUMBER).description("HTTP 상태 코드"),
                                fieldWithPath("message").type(JsonFieldType.STRING).description("응답 메시지"),
                                fieldWithPath("data").type(JsonFieldType.NULL).description("추가 데이터 없음")
                        )
                ));

        assertThat(postRepository.findById(savedPost.getId())).isEmpty();
    }

    @Test
    @DisplayName("관리자는 다른 사용자의 게시글을 삭제할 수 있다")
    void should_delete_post_when_admin_requests_deletion() throws Exception {
        Post savedPost = savePost(authorUser, PostCategory.FREE, "삭제 대상", "삭제 본문");

        mockMvc.perform(delete("/api/posts/{postId}", savedPost.getId())
                .header("Authorization", "Bearer " + adminAccessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("게시글이 삭제되었습니다."));

        assertThat(postRepository.findById(savedPost.getId())).isEmpty();
    }

    @Test
    @DisplayName("일반 사용자는 다른 사용자의 게시글을 삭제할 수 없다")
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
