package com.cubinghub.domain.post;

import com.cubinghub.common.exception.CustomApiException;
import static org.hamcrest.Matchers.allOf;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.cubinghub.domain.post.dto.request.PostCreateRequest;
import com.cubinghub.domain.post.dto.request.PostUpdateRequest;
import com.cubinghub.domain.post.entity.Post;
import com.cubinghub.domain.post.entity.PostAttachment;
import com.cubinghub.domain.post.entity.PostCategory;
import com.cubinghub.domain.post.repository.PostAttachmentRepository;
import com.cubinghub.domain.post.repository.PostRepository;
import com.cubinghub.domain.post.repository.PostViewRepository;
import com.cubinghub.domain.post.storage.PostImageStorageService;
import com.cubinghub.domain.post.storage.StoredPostImage;
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
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.mock.web.MockMultipartFile;

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
    private PostAttachmentRepository postAttachmentRepository;

    @Autowired
    private PostViewRepository postViewRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private EntityManager entityManager;

    @MockBean
    private PostImageStorageService postImageStorageService;

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
    @DisplayName("일반 사용자가 공지사항 게시글 생성 요청을 보내면 403을 반환한다")
    void should_return_forbidden_when_non_admin_creates_notice_post() throws Exception {
        PostCreateRequest request = new PostCreateRequest(PostCategory.NOTICE, "공지 제목", "공지 본문");

        mockMvc.perform(post("/api/posts")
                        .header("Authorization", "Bearer " + authorAccessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.message").value("공지사항 작성/수정 권한이 없습니다."));
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
    @DisplayName("인증 토큰의 사용자 정보가 없으면 게시글 생성 요청은 401을 반환한다")
    void should_return_unauthorized_when_creating_post_with_missing_user() throws Exception {
        User missingUser = User.builder()
                .email("missing@cubinghub.com")
                .password("password")
                .nickname("Missing")
                .role(UserRole.ROLE_USER)
                .status(UserStatus.ACTIVE)
                .build();
        String missingUserAccessToken = TestFixtures.generateAccessToken(jwtTokenProvider, missingUser);
        PostCreateRequest request = new PostCreateRequest(PostCategory.FREE, "첫 게시글", "게시글 본문입니다.");

        mockMvc.perform(post("/api/posts")
                        .header("Authorization", "Bearer " + missingUserAccessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("사용자를 찾을 수 없습니다."));
    }

    @Test
    @DisplayName("게시글 생성 요청이 유효하지 않으면 400을 반환한다")
    void should_return_bad_request_when_creating_post_with_invalid_request() throws Exception {
        PostCreateRequest request = new PostCreateRequest(null, "", "");

        mockMvc.perform(post("/api/posts")
                        .header("Authorization", "Bearer " + authorAccessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message", allOf(
                        containsString("잘못된 입력값입니다:"),
                        containsString("카테고리는 필수입니다."),
                        containsString("제목은 필수입니다."),
                        containsString("내용은 필수입니다.")
                )));
    }

    @Test
    @DisplayName("게시글 본문이 너무 길면 생성 요청은 400을 반환한다")
    void should_return_bad_request_when_creating_post_with_content_over_max_length() throws Exception {
        PostCreateRequest request = new PostCreateRequest(PostCategory.FREE, "제목", "a".repeat(2001));

        mockMvc.perform(post("/api/posts")
                        .header("Authorization", "Bearer " + authorAccessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("내용은 2000자 이하이어야 합니다.")));
    }

    @Test
    @DisplayName("게시글 목록 조회 요청이 오면 카테고리 검색과 페이지 메타데이터를 함께 반환한다")
    void should_return_paginated_posts_when_list_query_parameters_are_provided() throws Exception {
        savePost(authorUser, PostCategory.FREE, "큐브 연습법", "OLL 연습 내용을 정리합니다.");
        savePost(otherUser, PostCategory.FREE, "대회 후기", "큐브 대회 후기와 기록");
        savePost(authorUser, PostCategory.NOTICE, "공지 제목", "운영 공지입니다.");

        mockMvc.perform(get("/api/posts")
                        .param("category", "FREE")
                        .param("keyword", "큐브")
                        .param("author", "Author")
                        .param("page", "1")
                        .param("size", "1")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("게시글 목록을 조회했습니다."))
                .andExpect(jsonPath("$.data.items.length()").value(1))
                .andExpect(jsonPath("$.data.items[0].title").value("큐브 연습법"))
                .andExpect(jsonPath("$.data.items[0].category").value("FREE"))
                .andExpect(jsonPath("$.data.page").value(1))
                .andExpect(jsonPath("$.data.size").value(1))
                .andExpect(jsonPath("$.data.totalElements").value(1))
                .andExpect(jsonPath("$.data.totalPages").value(1))
                .andExpect(jsonPath("$.data.hasNext").value(false))
                .andExpect(jsonPath("$.data.hasPrevious").value(false));
    }

    @Test
    @DisplayName("게시글 목록 조회에서 page가 1보다 작으면 400을 반환한다")
    void should_return_bad_request_when_post_list_page_is_less_than_one() throws Exception {
        mockMvc.perform(get("/api/posts")
                        .param("page", "0")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("page는 1 이상이어야 합니다."));
    }

    @Test
    @DisplayName("게시글 목록 조회에서 category 형식이 잘못되면 400을 반환한다")
    void should_return_bad_request_when_post_list_category_is_invalid() throws Exception {
        mockMvc.perform(get("/api/posts")
                        .param("category", "INVALID")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("category 파라미터 형식이 올바르지 않습니다."));
    }

    @Test
    @DisplayName("게시글 목록 조회에서 검색어가 너무 길면 400을 반환한다")
    void should_return_bad_request_when_post_list_query_exceeds_max_length() throws Exception {
        mockMvc.perform(get("/api/posts")
                        .param("keyword", "a".repeat(101))
                        .param("author", "b".repeat(51))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("게시글 검색어는 100자 이하여야 합니다."));
    }

    @Test
    @DisplayName("비로그인 사용자가 게시글 상세를 조회해도 조회수는 증가하지 않는다")
    void should_not_increase_view_count_when_post_detail_is_requested_without_authentication() throws Exception {
        Post savedPost = savePost(authorUser, PostCategory.FREE, "상세 제목", "상세 본문");

        mockMvc.perform(get("/api/posts/{postId}", savedPost.getId())
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("게시글을 조회했습니다."))
                .andExpect(jsonPath("$.data.viewCount").value(0))
                .andExpect(jsonPath("$.data.attachments.length()").value(0));

        entityManager.flush();
        entityManager.clear();

        Post foundPost = postRepository.findById(savedPost.getId()).orElseThrow();
        assertThat(foundPost.getViewCount()).isZero();
        assertThat(postViewRepository.findAll()).isEmpty();
    }

    @Test
    @DisplayName("로그인 사용자의 게시글 조회수는 계정당 한 번만 증가한다")
    void should_count_unique_post_views_once_per_authenticated_user() throws Exception {
        Post savedPost = savePost(authorUser, PostCategory.FREE, "상세 제목", "상세 본문");

        mockMvc.perform(get("/api/posts/{postId}", savedPost.getId())
                        .header("Authorization", "Bearer " + authorAccessToken)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.viewCount").value(1));

        mockMvc.perform(get("/api/posts/{postId}", savedPost.getId())
                        .header("Authorization", "Bearer " + authorAccessToken)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.viewCount").value(1));

        mockMvc.perform(get("/api/posts/{postId}", savedPost.getId())
                        .header("Authorization", "Bearer " + otherAccessToken)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.viewCount").value(2));

        entityManager.flush();
        entityManager.clear();

        Post foundPost = postRepository.findById(savedPost.getId()).orElseThrow();
        assertThat(foundPost.getViewCount()).isEqualTo(2);
        assertThat(postViewRepository.findAll()).hasSize(2);
    }

    @Test
    @DisplayName("로그인 사용자가 첨부 이미지가 있는 게시글 상세를 조회하면 첨부 목록과 함께 응답한다")
    void should_return_post_detail_with_attachments_when_authenticated_user_requests_post_detail() throws Exception {
        Post savedPost = savePost(authorUser, PostCategory.FREE, "이미지 제목", "이미지 본문");
        postAttachmentRepository.save(PostAttachment.builder()
                .post(savedPost)
                .objectKey("community/posts/detail.png")
                .imageUrl("https://cdn.example.com/community/posts/detail.png")
                .originalFileName("detail.png")
                .contentType(MediaType.IMAGE_PNG_VALUE)
                .fileSizeBytes(1234L)
                .displayOrder(0)
                .build());

        mockMvc.perform(get("/api/posts/{postId}", savedPost.getId())
                        .header("Authorization", "Bearer " + authorAccessToken)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("게시글을 조회했습니다."))
                .andExpect(jsonPath("$.data.viewCount").value(1))
                .andExpect(jsonPath("$.data.attachments.length()").value(1))
                .andExpect(jsonPath("$.data.attachments[0].imageUrl").value("https://cdn.example.com/community/posts/detail.png"))
                .andExpect(jsonPath("$.data.attachments[0].originalFileName").value("detail.png"));
    }

    @Test
    @DisplayName("작성자가 게시글 수정 preload를 조회하면 조회수를 증가시키지 않는다")
    void should_return_editable_post_without_increasing_view_count_when_author_requests_edit_preload() throws Exception {
        Post savedPost = savePost(authorUser, PostCategory.FREE, "수정 전 제목", "수정 전 본문");

        mockMvc.perform(get("/api/posts/{postId}/edit", savedPost.getId())
                        .header("Authorization", "Bearer " + authorAccessToken)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("게시글 수정용 정보를 조회했습니다."))
                .andExpect(jsonPath("$.data.id").value(savedPost.getId()))
                .andExpect(jsonPath("$.data.viewCount").value(0));

        entityManager.flush();
        entityManager.clear();

        Post foundPost = postRepository.findById(savedPost.getId()).orElseThrow();
        assertThat(foundPost.getViewCount()).isZero();
        assertThat(postViewRepository.findAll()).isEmpty();
    }

    @Test
    @DisplayName("작성자가 아닌 사용자가 게시글 수정 preload를 조회하면 403을 반환한다")
    void should_return_forbidden_when_non_author_requests_edit_preload() throws Exception {
        Post savedPost = savePost(authorUser, PostCategory.FREE, "수정 전 제목", "수정 전 본문");

        mockMvc.perform(get("/api/posts/{postId}/edit", savedPost.getId())
                        .header("Authorization", "Bearer " + otherAccessToken)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.message").value("게시글 수정/삭제 권한이 없습니다."));
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
        PostUpdateRequest request = new PostUpdateRequest(PostCategory.FREE, "수정 후 제목", "수정 후 본문");

        mockMvc.perform(put("/api/posts/{postId}", savedPost.getId())
                        .header("Authorization", "Bearer " + authorAccessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("게시글이 수정되었습니다."));

        entityManager.flush();
        entityManager.clear();

        Post updatedPost = postRepository.findById(savedPost.getId()).orElseThrow();
        assertThat(updatedPost.getCategory()).isEqualTo(PostCategory.FREE);
        assertThat(updatedPost.getTitle()).isEqualTo("수정 후 제목");
        assertThat(updatedPost.getContent()).isEqualTo("수정 후 본문");
    }

    @Test
    @DisplayName("인증된 사용자가 다중 이미지를 포함한 multipart 게시글 생성 요청을 보내면 첨부 이미지를 함께 저장한다")
    void should_create_post_with_attachments_when_authenticated_user_submits_multipart_request() throws Exception {
        PostCreateRequest request = new PostCreateRequest(PostCategory.FREE, "이미지 게시글", "이미지가 포함된 본문");
        MockMultipartFile requestPart = new MockMultipartFile(
                "request",
                "",
                MediaType.APPLICATION_JSON_VALUE,
                objectMapper.writeValueAsBytes(request)
        );
        MockMultipartFile firstImage = new MockMultipartFile("images", "first.jpg", MediaType.IMAGE_JPEG_VALUE, "first-image".getBytes());
        MockMultipartFile secondImage = new MockMultipartFile("images", "second.png", MediaType.IMAGE_PNG_VALUE, "second-image".getBytes());

        when(postImageStorageService.upload(any())).thenReturn(
                new StoredPostImage("community/posts/first.jpg", "https://cdn.example.com/community/posts/first.jpg", "first.jpg", MediaType.IMAGE_JPEG_VALUE, (long) firstImage.getBytes().length),
                new StoredPostImage("community/posts/second.png", "https://cdn.example.com/community/posts/second.png", "second.png", MediaType.IMAGE_PNG_VALUE, (long) secondImage.getBytes().length)
        );

        mockMvc.perform(multipart("/api/posts")
                        .file(requestPart)
                        .file(firstImage)
                        .file(secondImage)
                        .header("Authorization", "Bearer " + authorAccessToken))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.message").value("게시글이 생성되었습니다."))
                .andExpect(jsonPath("$.data.id").exists());

        entityManager.flush();
        entityManager.clear();

        Post savedPost = postRepository.findAll().stream()
                .filter(post -> post.getTitle().equals("이미지 게시글"))
                .findFirst()
                .orElseThrow();
        assertThat(postAttachmentRepository.findAllByPostIdOrderByDisplayOrderAscIdAsc(savedPost.getId()))
                .extracting(PostAttachment::getOriginalFileName, PostAttachment::getDisplayOrder)
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple("first.jpg", 0),
                        org.assertj.core.groups.Tuple.tuple("second.png", 1)
                );
    }

    @Test
    @DisplayName("게시글 이미지 업로드 중 저장소 문제가 발생하면 503을 반환한다")
    void should_return_service_unavailable_when_post_image_upload_fails() throws Exception {
        PostCreateRequest request = new PostCreateRequest(PostCategory.FREE, "이미지 게시글", "이미지가 포함된 본문");
        MockMultipartFile requestPart = new MockMultipartFile(
                "request",
                "",
                MediaType.APPLICATION_JSON_VALUE,
                objectMapper.writeValueAsBytes(request)
        );
        MockMultipartFile imagePart = new MockMultipartFile("images", "cube.jpg", MediaType.IMAGE_JPEG_VALUE, "cube-image".getBytes());

        when(postImageStorageService.upload(any()))
                .thenThrow(new CustomApiException("이미지 업로드 서비스에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.", HttpStatus.SERVICE_UNAVAILABLE));

        mockMvc.perform(multipart("/api/posts")
                        .file(requestPart)
                        .file(imagePart)
                        .header("Authorization", "Bearer " + authorAccessToken))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.status").value(503))
                .andExpect(jsonPath("$.message").value("이미지 업로드 서비스에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요."));
    }

    @Test
    @DisplayName("작성자가 multipart 수정 요청으로 기존 이미지 일부를 유지하고 새 이미지를 추가할 수 있다")
    void should_update_post_with_retained_and_new_attachments_when_author_submits_multipart_request() throws Exception {
        Post savedPost = savePost(authorUser, PostCategory.FREE, "수정 전 제목", "수정 전 본문");
        PostAttachment removedAttachment = postAttachmentRepository.save(PostAttachment.builder()
                .post(savedPost)
                .objectKey("community/posts/old-remove.jpg")
                .imageUrl("https://cdn.example.com/community/posts/old-remove.jpg")
                .originalFileName("old-remove.jpg")
                .contentType(MediaType.IMAGE_JPEG_VALUE)
                .fileSizeBytes(10L)
                .displayOrder(0)
                .build());
        PostAttachment retainedAttachment = postAttachmentRepository.save(PostAttachment.builder()
                .post(savedPost)
                .objectKey("community/posts/old-keep.png")
                .imageUrl("https://cdn.example.com/community/posts/old-keep.png")
                .originalFileName("old-keep.png")
                .contentType(MediaType.IMAGE_PNG_VALUE)
                .fileSizeBytes(12L)
                .displayOrder(1)
                .build());
        entityManager.flush();
        entityManager.clear();

        PostUpdateRequest request = new PostUpdateRequest(
                PostCategory.FREE,
                "수정 후 제목",
                "수정 후 본문",
                java.util.List.of(retainedAttachment.getId())
        );
        MockMultipartFile requestPart = new MockMultipartFile(
                "request",
                "",
                MediaType.APPLICATION_JSON_VALUE,
                objectMapper.writeValueAsBytes(request)
        );
        MockMultipartFile newImage = new MockMultipartFile("images", "new.webp", "image/webp", "new-image".getBytes());

        when(postImageStorageService.upload(any())).thenReturn(
                new StoredPostImage("community/posts/new.webp", "https://cdn.example.com/community/posts/new.webp", "new.webp", "image/webp", (long) newImage.getBytes().length)
        );

        mockMvc.perform(multipart("/api/posts/{postId}", savedPost.getId())
                        .file(requestPart)
                        .file(newImage)
                        .header("Authorization", "Bearer " + authorAccessToken)
                        .with(httpServletRequest -> {
                            httpServletRequest.setMethod("PUT");
                            return httpServletRequest;
                        }))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("게시글이 수정되었습니다."));

        entityManager.flush();
        entityManager.clear();

        Post updatedPost = postRepository.findById(savedPost.getId()).orElseThrow();
        assertThat(updatedPost.getTitle()).isEqualTo("수정 후 제목");
        assertThat(postAttachmentRepository.findAllByPostIdOrderByDisplayOrderAscIdAsc(savedPost.getId()))
                .extracting(PostAttachment::getOriginalFileName, PostAttachment::getDisplayOrder)
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple("old-keep.png", 0),
                        org.assertj.core.groups.Tuple.tuple("new.webp", 1)
                );
    }

    @Test
    @DisplayName("게시글 수정 요청의 retainedAttachmentIds가 현재 첨부 목록과 맞지 않으면 400을 반환한다")
    void should_return_bad_request_when_retained_attachment_ids_are_invalid() throws Exception {
        Post savedPost = savePost(authorUser, PostCategory.FREE, "수정 전 제목", "수정 전 본문");
        PostAttachment retainedAttachment = postAttachmentRepository.save(PostAttachment.builder()
                .post(savedPost)
                .objectKey("community/posts/old-keep.png")
                .imageUrl("https://cdn.example.com/community/posts/old-keep.png")
                .originalFileName("old-keep.png")
                .contentType(MediaType.IMAGE_PNG_VALUE)
                .fileSizeBytes(12L)
                .displayOrder(0)
                .build());
        entityManager.flush();
        entityManager.clear();

        PostUpdateRequest request = new PostUpdateRequest(
                PostCategory.FREE,
                "수정 후 제목",
                "수정 후 본문",
                java.util.List.of(retainedAttachment.getId(), 99999L)
        );

        mockMvc.perform(put("/api/posts/{postId}", savedPost.getId())
                        .header("Authorization", "Bearer " + authorAccessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("기존 첨부 이미지 정보를 확인할 수 없습니다. 새로고침 후 다시 시도해주세요."));
    }

    @Test
    @DisplayName("관리자가 수정 요청을 보내면 다른 사용자의 게시글도 변경할 수 있다")
    void should_update_post_when_admin_submits_valid_request() throws Exception {
        Post savedPost = savePost(authorUser, PostCategory.FREE, "수정 전 제목", "수정 전 본문");
        PostUpdateRequest request = new PostUpdateRequest(PostCategory.NOTICE, "관리자 수정", "관리자 본문");

        mockMvc.perform(put("/api/posts/{postId}", savedPost.getId())
                        .header("Authorization", "Bearer " + adminAccessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("게시글이 수정되었습니다."));

        entityManager.flush();
        entityManager.clear();

        Post updatedPost = postRepository.findById(savedPost.getId()).orElseThrow();
        assertThat(updatedPost.getCategory()).isEqualTo(PostCategory.NOTICE);
        assertThat(updatedPost.getTitle()).isEqualTo("관리자 수정");
        assertThat(updatedPost.getContent()).isEqualTo("관리자 본문");
    }

    @Test
    @DisplayName("일반 사용자가 공지사항 게시글 수정 요청을 보내면 403을 반환한다")
    void should_return_forbidden_when_non_admin_updates_post_to_notice() throws Exception {
        Post savedPost = savePost(authorUser, PostCategory.FREE, "수정 전 제목", "수정 전 본문");
        PostUpdateRequest request = new PostUpdateRequest(PostCategory.NOTICE, "공지 제목", "공지 본문");

        mockMvc.perform(put("/api/posts/{postId}", savedPost.getId())
                        .header("Authorization", "Bearer " + authorAccessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.message").value("공지사항 작성/수정 권한이 없습니다."));
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
