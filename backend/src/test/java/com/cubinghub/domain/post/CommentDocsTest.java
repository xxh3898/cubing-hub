package com.cubinghub.domain.post;

import static org.hamcrest.Matchers.nullValue;
import static org.springframework.restdocs.mockmvc.MockMvcRestDocumentation.document;
import static org.springframework.restdocs.mockmvc.RestDocumentationRequestBuilders.delete;
import static org.springframework.restdocs.mockmvc.RestDocumentationRequestBuilders.get;
import static org.springframework.restdocs.mockmvc.RestDocumentationRequestBuilders.post;
import static org.springframework.restdocs.payload.PayloadDocumentation.fieldWithPath;
import static org.springframework.restdocs.payload.PayloadDocumentation.requestFields;
import static org.springframework.restdocs.payload.PayloadDocumentation.responseFields;
import static org.springframework.restdocs.request.RequestDocumentation.parameterWithName;
import static org.springframework.restdocs.request.RequestDocumentation.pathParameters;
import static org.springframework.restdocs.request.RequestDocumentation.queryParameters;
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
import com.cubinghub.integration.RestDocsIntegrationTest;
import com.cubinghub.security.JwtTokenProvider;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Collections;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.restdocs.payload.JsonFieldType;
import org.springframework.security.core.userdetails.UserDetails;

class CommentDocsTest extends RestDocsIntegrationTest {

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

    private User authorUser;
    private User otherUser;
    private User adminUser;
    private Post savedPost;
    private String authorAccessToken;
    private String otherAccessToken;

    @BeforeEach
    void setUp() {
        authorUser = saveUser("author@cubinghub.com", "Author", UserRole.ROLE_USER);
        otherUser = saveUser("other@cubinghub.com", "OtherUser", UserRole.ROLE_USER);
        adminUser = saveUser("admin@cubinghub.com", "AdminUser", UserRole.ROLE_ADMIN);
        savedPost = savePost(authorUser, PostCategory.FREE, "게시글 제목", "게시글 본문");

        authorAccessToken = generateAccessToken(authorUser);
        otherAccessToken = generateAccessToken(otherUser);
    }

    @Test
    @DisplayName("댓글 목록 조회는 공개되며 최신순 페이지 메타데이터를 반환한다")
    void should_return_paginated_comments_when_comment_list_is_requested() throws Exception {
        saveComment(savedPost, authorUser, "첫 댓글");
        saveComment(savedPost, otherUser, "둘째 댓글");

        mockMvc.perform(get("/api/posts/{postId}/comments", savedPost.getId())
                        .param("page", "1")
                        .param("size", "5")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.message").value("댓글 목록을 조회했습니다."))
                .andDo(document("comment/list",
                        pathParameters(
                                parameterWithName("postId").description("댓글을 조회할 게시글 ID")
                        ),
                        queryParameters(
                                parameterWithName("page").optional().description("조회할 페이지 번호 (1부터 시작)"),
                                parameterWithName("size").optional().description("페이지당 댓글 수")
                        ),
                        responseFields(
                                fieldWithPath("status").type(JsonFieldType.NUMBER).description("HTTP 상태 코드"),
                                fieldWithPath("message").type(JsonFieldType.STRING).description("응답 메시지"),
                                fieldWithPath("data").type(JsonFieldType.OBJECT).description("댓글 페이지 정보"),
                                fieldWithPath("data.items").type(JsonFieldType.ARRAY).description("댓글 목록"),
                                fieldWithPath("data.items[].id").type(JsonFieldType.NUMBER).description("댓글 ID"),
                                fieldWithPath("data.items[].authorNickname").type(JsonFieldType.STRING).description("작성자 닉네임"),
                                fieldWithPath("data.items[].content").type(JsonFieldType.STRING).description("댓글 본문"),
                                fieldWithPath("data.items[].createdAt").type(JsonFieldType.STRING).description("작성 시각"),
                                fieldWithPath("data.page").type(JsonFieldType.NUMBER).description("현재 페이지 번호"),
                                fieldWithPath("data.size").type(JsonFieldType.NUMBER).description("페이지당 댓글 수"),
                                fieldWithPath("data.totalElements").type(JsonFieldType.NUMBER).description("전체 댓글 수"),
                                fieldWithPath("data.totalPages").type(JsonFieldType.NUMBER).description("전체 페이지 수"),
                                fieldWithPath("data.hasNext").type(JsonFieldType.BOOLEAN).description("다음 페이지 존재 여부"),
                                fieldWithPath("data.hasPrevious").type(JsonFieldType.BOOLEAN).description("이전 페이지 존재 여부")
                        )
                ));
    }

    @Test
    @DisplayName("인증된 사용자는 댓글을 생성할 수 있다")
    void should_create_comment_when_authenticated_user_submits_valid_request() throws Exception {
        CommentCreateRequest request = new CommentCreateRequest("댓글 본문입니다.");

        mockMvc.perform(post("/api/posts/{postId}/comments", savedPost.getId())
                        .header("Authorization", "Bearer " + authorAccessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value(201))
                .andExpect(jsonPath("$.message").value("댓글이 생성되었습니다."))
                .andDo(document("comment/create",
                        pathParameters(
                                parameterWithName("postId").description("댓글을 생성할 게시글 ID")
                        ),
                        requestFields(
                                fieldWithPath("content").description("댓글 본문")
                        ),
                        responseFields(
                                fieldWithPath("status").type(JsonFieldType.NUMBER).description("HTTP 상태 코드"),
                                fieldWithPath("message").type(JsonFieldType.STRING).description("응답 메시지"),
                                fieldWithPath("data").type(JsonFieldType.OBJECT).description("생성된 댓글 정보"),
                                fieldWithPath("data.id").type(JsonFieldType.NUMBER).description("생성된 댓글 ID")
                        )
                ));
    }

    @Test
    @DisplayName("작성자는 자신의 댓글을 삭제할 수 있다")
    void should_delete_comment_when_author_requests_deletion() throws Exception {
        Comment savedComment = saveComment(savedPost, authorUser, "삭제 댓글");

        mockMvc.perform(delete("/api/posts/{postId}/comments/{commentId}", savedPost.getId(), savedComment.getId())
                        .header("Authorization", "Bearer " + authorAccessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.message").value("댓글이 삭제되었습니다."))
                .andExpect(jsonPath("$.data").value(nullValue()))
                .andDo(document("comment/delete",
                        pathParameters(
                                parameterWithName("postId").description("댓글이 속한 게시글 ID"),
                                parameterWithName("commentId").description("삭제할 댓글 ID")
                        ),
                        responseFields(
                                fieldWithPath("status").type(JsonFieldType.NUMBER).description("HTTP 상태 코드"),
                                fieldWithPath("message").type(JsonFieldType.STRING).description("응답 메시지"),
                                fieldWithPath("data").type(JsonFieldType.NULL).description("추가 데이터 없음")
                        )
                ));
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

    private Comment saveComment(Post post, User user, String content) {
        return commentRepository.save(Comment.builder()
                .post(post)
                .user(user)
                .content(content)
                .build());
    }
}
