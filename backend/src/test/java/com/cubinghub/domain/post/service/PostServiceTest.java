package com.cubinghub.domain.post.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.cubinghub.common.exception.CustomApiException;
import com.cubinghub.config.PostImageStorageProperties;
import com.cubinghub.domain.post.dto.request.PostCreateRequest;
import com.cubinghub.domain.post.dto.request.PostUpdateRequest;
import com.cubinghub.domain.post.dto.response.PostDetailResponse;
import com.cubinghub.domain.post.dto.response.PostListItemResponse;
import com.cubinghub.domain.post.dto.response.PostPageResponse;
import com.cubinghub.domain.post.entity.PostAttachment;
import com.cubinghub.domain.post.entity.Post;
import com.cubinghub.domain.post.entity.PostCategory;
import com.cubinghub.domain.post.entity.PostView;
import com.cubinghub.domain.post.repository.CommentRepository;
import com.cubinghub.domain.post.repository.PostAttachmentRepository;
import com.cubinghub.domain.post.repository.PostRepository;
import com.cubinghub.domain.post.repository.PostSearchResult;
import com.cubinghub.domain.post.repository.PostViewRepository;
import com.cubinghub.domain.post.storage.PostImageStorageService;
import com.cubinghub.domain.post.storage.StoredPostImage;
import com.cubinghub.domain.user.entity.User;
import com.cubinghub.domain.user.entity.UserRole;
import com.cubinghub.domain.user.entity.UserStatus;
import com.cubinghub.domain.user.repository.UserRepository;
import com.cubinghub.support.TestFixtures;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.function.Consumer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@ExtendWith(MockitoExtension.class)
@DisplayName("PostService 단위 테스트")
class PostServiceTest {

    @Mock
    private PostRepository postRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private CommentRepository commentRepository;

    @Mock
    private PostAttachmentRepository postAttachmentRepository;

    @Mock
    private PostViewRepository postViewRepository;

    @Mock
    private PostImageStorageService postImageStorageService;

    private PostImageStorageProperties properties;
    private PostService postService;

    @BeforeEach
    void setUp() {
        properties = new PostImageStorageProperties();
        postService = new PostService(
                postRepository,
                commentRepository,
                postAttachmentRepository,
                postViewRepository,
                userRepository,
                postImageStorageService,
                properties
        );

        lenient().when(postAttachmentRepository.findAllByPostIdOrderByDisplayOrderAscIdAsc(anyLong())).thenReturn(List.of());
    }

    @Test
    @DisplayName("게시글 생성 시 작성자와 요청 내용을 저장한다")
    void should_create_post_when_user_exists() {
        User author = TestFixtures.createUser(1L, "author@cubinghub.com", "Author", UserRole.ROLE_USER, UserStatus.ACTIVE);
        PostCreateRequest request = new PostCreateRequest(PostCategory.FREE, "제목", "본문");
        Post savedPost = TestFixtures.createPost(10L, author, PostCategory.FREE, "제목", "본문");

        when(userRepository.findByEmail(author.getEmail())).thenReturn(Optional.of(author));
        when(postRepository.save(any(Post.class))).thenReturn(savedPost);

        Long postId = postService.createPost(author.getEmail(), request);

        ArgumentCaptor<Post> postCaptor = ArgumentCaptor.forClass(Post.class);
        verify(postRepository).save(postCaptor.capture());

        assertThat(postId).isEqualTo(savedPost.getId());
        assertThat(postCaptor.getValue().getUser()).isEqualTo(author);
        assertThat(postCaptor.getValue().getCategory()).isEqualTo(PostCategory.FREE);
        assertThat(postCaptor.getValue().getTitle()).isEqualTo("제목");
        assertThat(postCaptor.getValue().getContent()).isEqualTo("본문");
    }

    @Test
    @DisplayName("일반 사용자는 공지사항 게시글을 생성할 수 없다")
    void should_throw_forbidden_exception_when_non_admin_creates_notice_post() {
        User author = TestFixtures.createUser(1L, "author@cubinghub.com", "Author", UserRole.ROLE_USER, UserStatus.ACTIVE);
        when(userRepository.findByEmail(author.getEmail())).thenReturn(Optional.of(author));

        Throwable thrown = catchThrowable(() ->
                postService.createPost(
                        author.getEmail(),
                        new PostCreateRequest(PostCategory.NOTICE, "공지 제목", "공지 본문")
                )
        );

        assertThat(thrown).isInstanceOf(CustomApiException.class);
        CustomApiException exception = (CustomApiException) thrown;
        assertThat(exception.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(exception.getMessage()).isEqualTo("공지사항 작성/수정 권한이 없습니다.");
    }

    @Test
    @DisplayName("게시글 생성 시 작성자가 없으면 401 예외를 반환한다")
    void should_throw_unauthorized_exception_when_user_does_not_exist_on_create() {
        when(userRepository.findByEmail("missing@cubinghub.com")).thenReturn(Optional.empty());

        Throwable thrown = catchThrowable(() ->
                postService.createPost(
                        "missing@cubinghub.com",
                        new PostCreateRequest(PostCategory.FREE, "제목", "본문")
                )
        );

        assertThat(thrown).isInstanceOf(CustomApiException.class);
        CustomApiException exception = (CustomApiException) thrown;
        assertThat(exception.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(exception.getMessage()).isEqualTo("사용자를 찾을 수 없습니다.");
    }

    @Test
    @DisplayName("게시글 목록 조회는 검색 조건과 페이지 정보를 repository에 위임한다")
    void should_delegate_post_search_with_pagination_when_get_posts_is_called() {
        List<PostListItemResponse> expected = List.of(
                new PostListItemResponse(1L, PostCategory.FREE, "큐브 연습법", "Author", 3, null)
        );
        when(postRepository.search(PostCategory.FREE, "큐브", "Author", 8, 8))
                .thenReturn(new PostSearchResult(expected, 17L));

        PostPageResponse result = postService.getPosts(PostCategory.FREE, "큐브", "Author", 2, 8);

        assertThat(result.getItems()).isEqualTo(expected);
        assertThat(result.getPage()).isEqualTo(2);
        assertThat(result.getSize()).isEqualTo(8);
        assertThat(result.getTotalElements()).isEqualTo(17L);
        assertThat(result.getTotalPages()).isEqualTo(3);
        assertThat(result.isHasNext()).isTrue();
        assertThat(result.isHasPrevious()).isTrue();
        verify(postRepository).search(PostCategory.FREE, "큐브", "Author", 8, 8);
    }

    @Test
    @DisplayName("게시글 목록 조회 결과가 비어 있으면 totalPages는 0이다")
    void should_return_zero_total_pages_when_post_search_result_is_empty() {
        when(postRepository.search(null, null, null, 0, 10))
                .thenReturn(new PostSearchResult(List.of(), 0L));

        PostPageResponse result = postService.getPosts(null, null, null, 1, 10);

        assertThat(result.getTotalPages()).isZero();
        assertThat(result.isHasNext()).isFalse();
    }

    @Test
    @DisplayName("게시글 목록 조회 시 page가 1보다 작으면 실패한다")
    void should_throw_illegal_argument_exception_when_page_is_less_than_one() {
        Throwable thrown = catchThrowable(() -> postService.getPosts(null, null, null, 0, 8));

        assertThat(thrown)
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("잘못된 페이지 번호입니다.");
    }

    @Test
    @DisplayName("게시글 목록 조회 시 size가 허용 범위를 벗어나면 실패한다")
    void should_throw_illegal_argument_exception_when_size_is_out_of_range() {
        Throwable thrown = catchThrowable(() -> postService.getPosts(null, null, null, 1, 101));

        assertThat(thrown)
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("한 번에 조회할 수 있는 개수는 1개 이상 100개 이하여야 합니다.");
    }

    @Test
    @DisplayName("게시글 목록 조회 시 size가 1보다 작으면 실패한다")
    void should_throw_illegal_argument_exception_when_size_is_less_than_one() {
        Throwable thrown = catchThrowable(() -> postService.getPosts(null, null, null, 1, 0));

        assertThat(thrown)
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("한 번에 조회할 수 있는 개수는 1개 이상 100개 이하여야 합니다.");
    }

    @Test
    @DisplayName("게시글 목록 조회 시 작성자 검색어가 너무 길면 실패한다")
    void should_throw_illegal_argument_exception_when_author_keyword_is_too_long() {
        Throwable thrown = catchThrowable(() -> postService.getPosts(null, null, "a".repeat(51), 1, 10));

        assertThat(thrown)
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("작성자 검색어는 50자 이하여야 합니다.");
    }

    @Test
    @DisplayName("게시글 목록 조회 시 작성자 검색어가 공백이면 정상적으로 검색을 위임한다")
    void should_delegate_post_search_when_author_keyword_is_blank() {
        when(postRepository.search(null, null, " ", 0, 10))
                .thenReturn(new PostSearchResult(List.of(), 0L));

        postService.getPosts(null, null, " ", 1, 10);

        verify(postRepository).search(null, null, " ", 0, 10);
    }

    @Test
    @DisplayName("게시글 목록 조회 시 키워드가 너무 길면 실패한다")
    void should_throw_illegal_argument_exception_when_search_keyword_is_too_long() {
        Throwable thrown = catchThrowable(() -> postService.getPosts(null, "a".repeat(101), null, 1, 10));

        assertThat(thrown)
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("게시글 검색어는 100자 이하여야 합니다.");
    }

    @Test
    @DisplayName("존재하지 않는 게시글 상세 조회는 404 예외를 반환한다")
    void should_throw_not_found_exception_when_post_does_not_exist() {
        when(postRepository.findWithUserById(999L)).thenReturn(Optional.empty());

        Throwable thrown = catchThrowable(() -> postService.getPost(999L));

        assertThat(thrown).isInstanceOf(CustomApiException.class);
        CustomApiException exception = (CustomApiException) thrown;
        assertThat(exception.getStatus()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(exception.getMessage()).isEqualTo("게시글을 찾을 수 없습니다.");
    }

    @Test
    @DisplayName("게시글 상세 조회 시 로그인 사용자의 첫 조회만 조회수를 증가시키고 응답으로 매핑한다")
    void should_increase_view_count_once_when_authenticated_user_views_post_for_first_time() {
        User author = TestFixtures.createUser(1L, "author@cubinghub.com", "Author", UserRole.ROLE_USER, UserStatus.ACTIVE);
        User viewer = TestFixtures.createUser(2L, "viewer@cubinghub.com", "Viewer", UserRole.ROLE_USER, UserStatus.ACTIVE);
        Post post = TestFixtures.createPost(10L, author, PostCategory.FREE, "제목", "본문");

        when(postRepository.findWithUserById(post.getId())).thenReturn(Optional.of(post));
        when(userRepository.findByEmail(viewer.getEmail())).thenReturn(Optional.of(viewer));
        when(postViewRepository.existsByPostIdAndUserId(post.getId(), viewer.getId())).thenReturn(false);

        PostDetailResponse response = postService.getPost(post.getId(), viewer.getEmail());

        assertThat(post.getViewCount()).isEqualTo(1);
        assertThat(response.getId()).isEqualTo(post.getId());
        assertThat(response.getTitle()).isEqualTo("제목");
        assertThat(response.getAuthorNickname()).isEqualTo("Author");
        assertThat(response.getViewCount()).isEqualTo(1);
        verify(postViewRepository).save(any(PostView.class));
    }

    @Test
    @DisplayName("게시글 상세 조회 중 조회수 기록이 실패해도 상세 응답은 반환한다")
    void should_return_post_detail_when_view_tracking_throws_runtime_exception() {
        User author = TestFixtures.createUser(1L, "author@cubinghub.com", "Author", UserRole.ROLE_USER, UserStatus.ACTIVE);
        User viewer = TestFixtures.createUser(2L, "viewer@cubinghub.com", "Viewer", UserRole.ROLE_USER, UserStatus.ACTIVE);
        Post post = TestFixtures.createPost(10L, author, PostCategory.FREE, "제목", "본문");

        when(postRepository.findWithUserById(post.getId())).thenReturn(Optional.of(post));
        when(userRepository.findByEmail(viewer.getEmail())).thenReturn(Optional.of(viewer));
        when(postViewRepository.existsByPostIdAndUserId(post.getId(), viewer.getId())).thenReturn(false);
        when(postViewRepository.save(any(PostView.class))).thenThrow(new RuntimeException("write failed"));

        PostDetailResponse response = postService.getPost(post.getId(), viewer.getEmail());

        assertThat(post.getViewCount()).isZero();
        assertThat(response.getId()).isEqualTo(post.getId());
        assertThat(response.getTitle()).isEqualTo("제목");
        assertThat(response.getAuthorNickname()).isEqualTo("Author");
        assertThat(response.getViewCount()).isZero();
        verify(postViewRepository).save(any(PostView.class));
    }

    @Test
    @DisplayName("게시글 상세 조회 시 조회수 저장이 중복 제약으로 실패해도 응답은 반환한다")
    void should_return_post_detail_when_view_tracking_throws_data_integrity_violation_exception() {
        User author = TestFixtures.createUser(1L, "author@cubinghub.com", "Author", UserRole.ROLE_USER, UserStatus.ACTIVE);
        User viewer = TestFixtures.createUser(2L, "viewer@cubinghub.com", "Viewer", UserRole.ROLE_USER, UserStatus.ACTIVE);
        Post post = TestFixtures.createPost(10L, author, PostCategory.FREE, "제목", "본문");

        when(postRepository.findWithUserById(post.getId())).thenReturn(Optional.of(post));
        when(userRepository.findByEmail(viewer.getEmail())).thenReturn(Optional.of(viewer));
        when(postViewRepository.existsByPostIdAndUserId(post.getId(), viewer.getId())).thenReturn(false);
        when(postViewRepository.save(any(PostView.class))).thenThrow(new org.springframework.dao.DataIntegrityViolationException("duplicate"));

        PostDetailResponse response = postService.getPost(post.getId(), viewer.getEmail());

        assertThat(response.getId()).isEqualTo(post.getId());
        assertThat(post.getViewCount()).isZero();
    }

    @Test
    @DisplayName("게시글 상세 조회 시 비로그인 사용자는 조회수를 증가시키지 않는다")
    void should_not_increase_view_count_when_anonymous_user_views_post() {
        User author = TestFixtures.createUser(1L, "author@cubinghub.com", "Author", UserRole.ROLE_USER, UserStatus.ACTIVE);
        Post post = TestFixtures.createPost(10L, author, PostCategory.FREE, "제목", "본문");

        when(postRepository.findWithUserById(post.getId())).thenReturn(Optional.of(post));

        PostDetailResponse response = postService.getPost(post.getId());

        assertThat(post.getViewCount()).isZero();
        assertThat(response.getViewCount()).isZero();
        verify(postViewRepository, never()).save(any(PostView.class));
    }

    @Test
    @DisplayName("게시글 수정 preload 조회는 조회수를 증가시키지 않고 상세를 반환한다")
    void should_return_editable_post_without_increasing_view_count_when_author_requests_edit_preload() {
        User author = TestFixtures.createUser(1L, "author@cubinghub.com", "Author", UserRole.ROLE_USER, UserStatus.ACTIVE);
        Post post = TestFixtures.createPost(10L, author, PostCategory.FREE, "제목", "본문");

        when(userRepository.findByEmail(author.getEmail())).thenReturn(Optional.of(author));
        when(postRepository.findWithUserById(post.getId())).thenReturn(Optional.of(post));

        PostDetailResponse response = postService.getEditablePost(post.getId(), author.getEmail());

        assertThat(post.getViewCount()).isZero();
        assertThat(response.getId()).isEqualTo(post.getId());
        assertThat(response.getViewCount()).isZero();
        verify(postViewRepository, never()).save(any(PostView.class));
    }

    @Test
    @DisplayName("게시글 수정 preload 조회는 작성자나 관리자가 아니면 403 예외를 반환한다")
    void should_throw_forbidden_exception_when_non_owner_requests_editable_post() {
        User author = TestFixtures.createUser(1L, "author@cubinghub.com", "Author", UserRole.ROLE_USER, UserStatus.ACTIVE);
        User viewer = TestFixtures.createUser(2L, "viewer@cubinghub.com", "Viewer", UserRole.ROLE_USER, UserStatus.ACTIVE);
        Post post = TestFixtures.createPost(10L, author, PostCategory.FREE, "제목", "본문");

        when(userRepository.findByEmail(viewer.getEmail())).thenReturn(Optional.of(viewer));
        when(postRepository.findWithUserById(post.getId())).thenReturn(Optional.of(post));

        Throwable thrown = catchThrowable(() -> postService.getEditablePost(post.getId(), viewer.getEmail()));

        assertThat(thrown).isInstanceOf(CustomApiException.class);
        CustomApiException exception = (CustomApiException) thrown;
        assertThat(exception.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(exception.getMessage()).isEqualTo("게시글 수정/삭제 권한이 없습니다.");
        verify(postViewRepository, never()).save(any(PostView.class));
    }

    @Test
    @DisplayName("작성자는 자신의 게시글을 수정할 수 있다")
    void should_update_post_when_author_updates_own_post() {
        User author = TestFixtures.createUser(1L, "author@cubinghub.com", "Author", UserRole.ROLE_USER, UserStatus.ACTIVE);
        Post post = TestFixtures.createPost(10L, author, PostCategory.FREE, "제목", "본문");
        PostUpdateRequest request = new PostUpdateRequest(PostCategory.FREE, "수정 제목", "수정 본문");

        when(userRepository.findByEmail(author.getEmail())).thenReturn(Optional.of(author));
        when(postRepository.findById(post.getId())).thenReturn(Optional.of(post));

        postService.updatePost(post.getId(), author.getEmail(), request);

        assertThat(post.getCategory()).isEqualTo(PostCategory.FREE);
        assertThat(post.getTitle()).isEqualTo("수정 제목");
        assertThat(post.getContent()).isEqualTo("수정 본문");
    }

    @Test
    @DisplayName("일반 사용자는 공지사항 게시글로 수정할 수 없다")
    void should_throw_forbidden_exception_when_non_admin_updates_post_to_notice() {
        User author = TestFixtures.createUser(1L, "author@cubinghub.com", "Author", UserRole.ROLE_USER, UserStatus.ACTIVE);
        Post post = TestFixtures.createPost(10L, author, PostCategory.FREE, "제목", "본문");

        when(userRepository.findByEmail(author.getEmail())).thenReturn(Optional.of(author));
        when(postRepository.findById(post.getId())).thenReturn(Optional.of(post));

        Throwable thrown = catchThrowable(() ->
                postService.updatePost(
                        post.getId(),
                        author.getEmail(),
                        new PostUpdateRequest(PostCategory.NOTICE, "공지 제목", "공지 본문")
                )
        );

        assertThat(thrown).isInstanceOf(CustomApiException.class);
        CustomApiException exception = (CustomApiException) thrown;
        assertThat(exception.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(exception.getMessage()).isEqualTo("공지사항 작성/수정 권한이 없습니다.");
    }

    @Test
    @DisplayName("게시글 수정 시 사용자가 없으면 401 예외를 반환한다")
    void should_throw_unauthorized_exception_when_user_does_not_exist_on_update() {
        when(userRepository.findByEmail("missing@cubinghub.com")).thenReturn(Optional.empty());

        Throwable thrown = catchThrowable(() ->
                postService.updatePost(
                        10L,
                        "missing@cubinghub.com",
                        new PostUpdateRequest(PostCategory.FREE, "수정 제목", "수정 본문")
                )
        );

        assertThat(thrown).isInstanceOf(CustomApiException.class);
        CustomApiException exception = (CustomApiException) thrown;
        assertThat(exception.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(exception.getMessage()).isEqualTo("사용자를 찾을 수 없습니다.");
    }

    @Test
    @DisplayName("게시글 수정 시 대상 게시글이 없으면 404 예외를 반환한다")
    void should_throw_not_found_exception_when_post_is_missing_on_update() {
        User author = TestFixtures.createUser(1L, "author@cubinghub.com", "Author", UserRole.ROLE_USER, UserStatus.ACTIVE);

        when(userRepository.findByEmail(author.getEmail())).thenReturn(Optional.of(author));
        when(postRepository.findById(999L)).thenReturn(Optional.empty());

        Throwable thrown = catchThrowable(() ->
                postService.updatePost(
                        999L,
                        author.getEmail(),
                        new PostUpdateRequest(PostCategory.FREE, "수정 제목", "수정 본문")
                )
        );

        assertThat(thrown).isInstanceOf(CustomApiException.class);
        CustomApiException exception = (CustomApiException) thrown;
        assertThat(exception.getStatus()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(exception.getMessage()).isEqualTo("게시글을 찾을 수 없습니다.");
    }

    @Test
    @DisplayName("일반 사용자는 다른 사용자의 게시글을 수정할 수 없다")
    void should_throw_forbidden_exception_when_non_author_updates_post() {
        User author = TestFixtures.createUser(1L, "author@cubinghub.com", "Author", UserRole.ROLE_USER, UserStatus.ACTIVE);
        User otherUser = TestFixtures.createUser(2L, "other@cubinghub.com", "Other", UserRole.ROLE_USER, UserStatus.ACTIVE);
        Post post = TestFixtures.createPost(10L, author, PostCategory.FREE, "제목", "본문");

        when(userRepository.findByEmail(otherUser.getEmail())).thenReturn(Optional.of(otherUser));
        when(postRepository.findById(post.getId())).thenReturn(Optional.of(post));

        Throwable thrown = catchThrowable(() ->
                postService.updatePost(
                        post.getId(),
                        otherUser.getEmail(),
                        new PostUpdateRequest(PostCategory.FREE, "수정 제목", "수정 본문")
                )
        );

        assertThat(thrown).isInstanceOf(CustomApiException.class);
        CustomApiException exception = (CustomApiException) thrown;
        assertThat(exception.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(exception.getMessage()).isEqualTo("게시글 수정/삭제 권한이 없습니다.");
    }

    @Test
    @DisplayName("관리자는 다른 사용자의 게시글을 공지사항으로 수정할 수 있다")
    void should_update_post_to_notice_when_admin_updates_other_users_post() {
        User author = TestFixtures.createUser(1L, "author@cubinghub.com", "Author", UserRole.ROLE_USER, UserStatus.ACTIVE);
        User admin = TestFixtures.createUser(99L, "admin@cubinghub.com", "Admin", UserRole.ROLE_ADMIN, UserStatus.ACTIVE);
        Post post = TestFixtures.createPost(10L, author, PostCategory.FREE, "제목", "본문");
        PostUpdateRequest request = new PostUpdateRequest(PostCategory.NOTICE, "공지 제목", "공지 본문");

        when(userRepository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));
        when(postRepository.findById(post.getId())).thenReturn(Optional.of(post));

        postService.updatePost(post.getId(), admin.getEmail(), request);

        assertThat(post.getCategory()).isEqualTo(PostCategory.NOTICE);
        assertThat(post.getTitle()).isEqualTo("공지 제목");
        assertThat(post.getContent()).isEqualTo("공지 본문");
    }

    @Test
    @DisplayName("이미지 목록에 null과 empty 파일이 섞여 있어도 유효한 파일만 업로드한다")
    void should_upload_only_valid_images_when_image_list_contains_null_and_empty_files() {
        User author = TestFixtures.createUser(1L, "author@cubinghub.com", "Author", UserRole.ROLE_USER, UserStatus.ACTIVE);
        Post savedPost = TestFixtures.createPost(10L, author, PostCategory.FREE, "제목", "본문");
        MockMultipartFile emptyFile = new MockMultipartFile("images", "empty.png", "image/png", new byte[0]);
        MockMultipartFile validFile = new MockMultipartFile("images", "cube.png", "image/png", "image-data".getBytes());
        StoredPostImage storedImage = new StoredPostImage("object-key", "https://cdn/object-key", "cube.png", "image/png", validFile.getSize());

        when(userRepository.findByEmail(author.getEmail())).thenReturn(Optional.of(author));
        when(postRepository.save(any(Post.class))).thenReturn(savedPost);
        when(postImageStorageService.upload(validFile)).thenReturn(storedImage);

        postService.createPost(
                author.getEmail(),
                new PostCreateRequest(PostCategory.FREE, "제목", "본문"),
                Arrays.asList(null, emptyFile, validFile)
        );

        verify(postImageStorageService).upload(validFile);
        verify(postAttachmentRepository).saveAll(any());
    }

    @Test
    @DisplayName("빈 이미지 목록이면 업로드 없이 게시글만 생성한다")
    void should_create_post_without_upload_when_image_list_is_empty() {
        User author = TestFixtures.createUser(1L, "author@cubinghub.com", "Author", UserRole.ROLE_USER, UserStatus.ACTIVE);
        Post savedPost = TestFixtures.createPost(10L, author, PostCategory.FREE, "제목", "본문");

        when(userRepository.findByEmail(author.getEmail())).thenReturn(Optional.of(author));
        when(postRepository.save(any(Post.class))).thenReturn(savedPost);

        Long postId = postService.createPost(
                author.getEmail(),
                new PostCreateRequest(PostCategory.FREE, "제목", "본문"),
                List.of()
        );

        assertThat(postId).isEqualTo(savedPost.getId());
        verify(postImageStorageService, never()).upload(any());
    }

    @Test
    @DisplayName("첨부 이미지 개수가 최대 개수를 넘으면 게시글 생성은 실패한다")
    void should_throw_illegal_argument_exception_when_attachment_count_exceeds_limit() {
        User author = TestFixtures.createUser(1L, "author@cubinghub.com", "Author", UserRole.ROLE_USER, UserStatus.ACTIVE);
        properties.setMaxFileCount(1);
        MockMultipartFile firstFile = new MockMultipartFile("images", "cube-1.png", "image/png", "image-1".getBytes());
        MockMultipartFile secondFile = new MockMultipartFile("images", "cube-2.png", "image/png", "image-2".getBytes());

        when(userRepository.findByEmail(author.getEmail())).thenReturn(Optional.of(author));

        Throwable thrown = catchThrowable(() -> postService.createPost(
                author.getEmail(),
                new PostCreateRequest(PostCategory.FREE, "제목", "본문"),
                List.of(firstFile, secondFile)
        ));

        assertThat(thrown)
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("게시글 이미지는 최대 1장까지 첨부할 수 있습니다.");
    }

    @Test
    @DisplayName("이미지 확장자가 없으면 게시글 생성은 실패한다")
    void should_throw_illegal_argument_exception_when_image_extension_is_missing() {
        User author = TestFixtures.createUser(1L, "author@cubinghub.com", "Author", UserRole.ROLE_USER, UserStatus.ACTIVE);
        MockMultipartFile invalidFile = new MockMultipartFile("images", "cube", "image/png", "image".getBytes());

        when(userRepository.findByEmail(author.getEmail())).thenReturn(Optional.of(author));

        Throwable thrown = catchThrowable(() -> postService.createPost(
                author.getEmail(),
                new PostCreateRequest(PostCategory.FREE, "제목", "본문"),
                List.of(invalidFile)
        ));

        assertThat(thrown)
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("게시글 이미지는 jpg, jpeg, png, webp 형식만 업로드할 수 있습니다.");
    }

    @Test
    @DisplayName("지원하지 않는 이미지 확장자면 게시글 생성은 실패한다")
    void should_throw_illegal_argument_exception_when_image_extension_is_not_supported() {
        User author = TestFixtures.createUser(1L, "author@cubinghub.com", "Author", UserRole.ROLE_USER, UserStatus.ACTIVE);
        MockMultipartFile invalidFile = new MockMultipartFile("images", "cube.gif", "image/gif", "image".getBytes());

        when(userRepository.findByEmail(author.getEmail())).thenReturn(Optional.of(author));

        Throwable thrown = catchThrowable(() -> postService.createPost(
                author.getEmail(),
                new PostCreateRequest(PostCategory.FREE, "제목", "본문"),
                List.of(invalidFile)
        ));

        assertThat(thrown)
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("게시글 이미지는 jpg, jpeg, png, webp 형식만 업로드할 수 있습니다.");
    }

    @Test
    @DisplayName("원본 파일명이 null이면 게시글 생성은 실패한다")
    void should_throw_illegal_argument_exception_when_image_original_filename_is_null() throws Exception {
        User author = TestFixtures.createUser(1L, "author@cubinghub.com", "Author", UserRole.ROLE_USER, UserStatus.ACTIVE);
        org.springframework.web.multipart.MultipartFile invalidFile = org.mockito.Mockito.mock(org.springframework.web.multipart.MultipartFile.class);
        when(invalidFile.isEmpty()).thenReturn(false);
        when(invalidFile.getOriginalFilename()).thenReturn(null);

        when(userRepository.findByEmail(author.getEmail())).thenReturn(Optional.of(author));

        Throwable thrown = catchThrowable(() -> postService.createPost(
                author.getEmail(),
                new PostCreateRequest(PostCategory.FREE, "제목", "본문"),
                List.of(invalidFile)
        ));

        assertThat(thrown)
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("게시글 이미지는 jpg, jpeg, png, webp 형식만 업로드할 수 있습니다.");
    }

    @Test
    @DisplayName("개별 이미지 크기가 최대 용량을 넘으면 게시글 생성은 실패한다")
    void should_throw_illegal_argument_exception_when_image_size_exceeds_limit() {
        User author = TestFixtures.createUser(1L, "author@cubinghub.com", "Author", UserRole.ROLE_USER, UserStatus.ACTIVE);
        properties.setMaxFileSizeBytes(3L);
        MockMultipartFile largeFile = new MockMultipartFile("images", "cube.png", "image/png", "1234".getBytes());

        when(userRepository.findByEmail(author.getEmail())).thenReturn(Optional.of(author));

        Throwable thrown = catchThrowable(() -> postService.createPost(
                author.getEmail(),
                new PostCreateRequest(PostCategory.FREE, "제목", "본문"),
                List.of(largeFile)
        ));

        assertThat(thrown)
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("이미지 파일은 10MB 이하여야 합니다.");
    }

    @Test
    @DisplayName("기존 첨부와 새 첨부를 합친 전체 용량이 최대치를 넘으면 게시글 수정은 실패한다")
    void should_throw_illegal_argument_exception_when_total_attachment_size_exceeds_limit() {
        User author = TestFixtures.createUser(1L, "author@cubinghub.com", "Author", UserRole.ROLE_USER, UserStatus.ACTIVE);
        Post post = TestFixtures.createPost(10L, author, PostCategory.FREE, "제목", "본문");
        PostAttachment attachment = createAttachment(1L, post, "old-key");
        ReflectionTestUtils.setField(attachment, "fileSizeBytes", 4L);
        properties.setMaxTotalSizeBytes(5L);
        MockMultipartFile newFile = new MockMultipartFile("images", "cube.png", "image/png", "12".getBytes());

        when(userRepository.findByEmail(author.getEmail())).thenReturn(Optional.of(author));
        when(postRepository.findById(post.getId())).thenReturn(Optional.of(post));
        when(postAttachmentRepository.findAllByPostIdOrderByDisplayOrderAscIdAsc(post.getId())).thenReturn(List.of(attachment));

        Throwable thrown = catchThrowable(() -> postService.updatePost(
                post.getId(),
                author.getEmail(),
                new PostUpdateRequest(PostCategory.FREE, "수정 제목", "수정 본문", List.of(1L)),
                List.of(newFile)
        ));

        assertThat(thrown)
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("게시글 이미지 전체 용량은 30MB 이하여야 합니다.");
    }

    @Test
    @DisplayName("중복 retained attachment id가 있으면 게시글 수정은 실패한다")
    void should_throw_illegal_argument_exception_when_retained_attachment_ids_are_duplicated() {
        User author = TestFixtures.createUser(1L, "author@cubinghub.com", "Author", UserRole.ROLE_USER, UserStatus.ACTIVE);
        Post post = TestFixtures.createPost(10L, author, PostCategory.FREE, "제목", "본문");
        PostAttachment attachment = createAttachment(1L, post, "object-key-1");

        when(userRepository.findByEmail(author.getEmail())).thenReturn(Optional.of(author));
        when(postRepository.findById(post.getId())).thenReturn(Optional.of(post));
        when(postAttachmentRepository.findAllByPostIdOrderByDisplayOrderAscIdAsc(post.getId())).thenReturn(List.of(attachment));

        Throwable thrown = catchThrowable(() -> postService.updatePost(
                post.getId(),
                author.getEmail(),
                new PostUpdateRequest(PostCategory.FREE, "수정 제목", "수정 본문", List.of(1L, 1L))
        ));

        assertThat(thrown)
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("기존 첨부 이미지 정보를 확인할 수 없습니다. 새로고침 후 다시 시도해주세요.");
    }

    @Test
    @DisplayName("롤백되면 업로드한 이미지를 best effort로 삭제한다")
    void should_delete_uploaded_images_when_transaction_is_rolled_back() {
        User author = TestFixtures.createUser(1L, "author@cubinghub.com", "Author", UserRole.ROLE_USER, UserStatus.ACTIVE);
        Post savedPost = TestFixtures.createPost(10L, author, PostCategory.FREE, "제목", "본문");
        MockMultipartFile validFile = new MockMultipartFile("images", "cube.png", "image/png", "image-data".getBytes());
        StoredPostImage storedImage = new StoredPostImage("object-key", "https://cdn/object-key", "cube.png", "image/png", validFile.getSize());

        when(userRepository.findByEmail(author.getEmail())).thenReturn(Optional.of(author));
        when(postRepository.save(any(Post.class))).thenReturn(savedPost);
        when(postImageStorageService.upload(validFile)).thenReturn(storedImage);

        withTransactionSynchronization(
                () -> postService.createPost(
                        author.getEmail(),
                        new PostCreateRequest(PostCategory.FREE, "제목", "본문"),
                        List.of(validFile)
                ),
                synchronizations -> synchronizations.forEach(sync -> sync.afterCompletion(TransactionSynchronization.STATUS_ROLLED_BACK))
        );

        verify(postImageStorageService).delete("object-key");
    }

    @Test
    @DisplayName("롤백 cleanup 삭제가 실패해도 예외를 전파하지 않는다")
    void should_ignore_storage_delete_failure_when_rollback_cleanup_fails() {
        User author = TestFixtures.createUser(1L, "author@cubinghub.com", "Author", UserRole.ROLE_USER, UserStatus.ACTIVE);
        Post savedPost = TestFixtures.createPost(10L, author, PostCategory.FREE, "제목", "본문");
        MockMultipartFile validFile = new MockMultipartFile("images", "cube.png", "image/png", "image-data".getBytes());
        StoredPostImage storedImage = new StoredPostImage("object-key", "https://cdn/object-key", "cube.png", "image/png", validFile.getSize());

        when(userRepository.findByEmail(author.getEmail())).thenReturn(Optional.of(author));
        when(postRepository.save(any(Post.class))).thenReturn(savedPost);
        when(postImageStorageService.upload(validFile)).thenReturn(storedImage);
        org.mockito.Mockito.doThrow(new RuntimeException("delete failed"))
                .when(postImageStorageService).delete("object-key");

        withTransactionSynchronization(
                () -> postService.createPost(
                        author.getEmail(),
                        new PostCreateRequest(PostCategory.FREE, "제목", "본문"),
                        List.of(validFile)
                ),
                synchronizations -> synchronizations.forEach(sync -> sync.afterCompletion(TransactionSynchronization.STATUS_ROLLED_BACK))
        );

        verify(postImageStorageService).delete("object-key");
    }

    @Test
    @DisplayName("커밋되면 롤백 cleanup은 실행하지 않는다")
    void should_skip_uploaded_image_cleanup_when_transaction_is_committed() {
        User author = TestFixtures.createUser(1L, "author@cubinghub.com", "Author", UserRole.ROLE_USER, UserStatus.ACTIVE);
        Post savedPost = TestFixtures.createPost(10L, author, PostCategory.FREE, "제목", "본문");
        MockMultipartFile validFile = new MockMultipartFile("images", "cube.png", "image/png", "image-data".getBytes());
        StoredPostImage storedImage = new StoredPostImage("object-key", "https://cdn/object-key", "cube.png", "image/png", validFile.getSize());

        when(userRepository.findByEmail(author.getEmail())).thenReturn(Optional.of(author));
        when(postRepository.save(any(Post.class))).thenReturn(savedPost);
        when(postImageStorageService.upload(validFile)).thenReturn(storedImage);

        withTransactionSynchronization(
                () -> postService.createPost(
                        author.getEmail(),
                        new PostCreateRequest(PostCategory.FREE, "제목", "본문"),
                        List.of(validFile)
                ),
                synchronizations -> synchronizations.forEach(sync -> sync.afterCompletion(TransactionSynchronization.STATUS_COMMITTED))
        );

        verify(postImageStorageService, never()).delete("object-key");
    }

    @Test
    @DisplayName("커밋 후 삭제 대상 첨부 이미지는 best effort로 삭제한다")
    void should_delete_removed_attachments_after_commit_and_ignore_storage_failures() {
        User author = TestFixtures.createUser(1L, "author@cubinghub.com", "Author", UserRole.ROLE_USER, UserStatus.ACTIVE);
        Post post = TestFixtures.createPost(10L, author, PostCategory.FREE, "제목", "본문");
        PostAttachment firstAttachment = createAttachment(1L, post, "old-key-1");
        PostAttachment secondAttachment = createAttachment(2L, post, "old-key-2");

        when(userRepository.findByEmail(author.getEmail())).thenReturn(Optional.of(author));
        when(postRepository.findById(post.getId())).thenReturn(Optional.of(post));
        when(postAttachmentRepository.findAllByPostIdOrderByDisplayOrderAscIdAsc(post.getId()))
                .thenReturn(List.of(firstAttachment, secondAttachment));
        org.mockito.Mockito.doThrow(new RuntimeException("delete failed"))
                .when(postImageStorageService).delete("old-key-1");

        withTransactionSynchronization(
                () -> postService.updatePost(
                        post.getId(),
                        author.getEmail(),
                        new PostUpdateRequest(PostCategory.FREE, "수정 제목", "수정 본문", List.of())
                ),
                synchronizations -> synchronizations.forEach(TransactionSynchronization::afterCommit)
        );

        verify(postAttachmentRepository).deleteAll(List.of(firstAttachment, secondAttachment));
        verify(postImageStorageService).delete("old-key-1");
        verify(postImageStorageService).delete("old-key-2");
    }

    @Test
    @DisplayName("작성자는 자신의 게시글을 삭제할 수 있다")
    void should_delete_post_when_author_deletes_own_post() {
        User author = TestFixtures.createUser(1L, "author@cubinghub.com", "Author", UserRole.ROLE_USER, UserStatus.ACTIVE);
        Post post = TestFixtures.createPost(10L, author, PostCategory.FREE, "제목", "본문");

        when(userRepository.findByEmail(author.getEmail())).thenReturn(Optional.of(author));
        when(postRepository.findById(post.getId())).thenReturn(Optional.of(post));

        postService.deletePost(post.getId(), author.getEmail());

        verify(postRepository).delete(post);
    }

    @Test
    @DisplayName("관리자는 다른 사용자의 게시글을 삭제할 수 있다")
    void should_delete_post_when_admin_deletes_other_users_post() {
        User author = TestFixtures.createUser(1L, "author@cubinghub.com", "Author", UserRole.ROLE_USER, UserStatus.ACTIVE);
        User admin = TestFixtures.createUser(99L, "admin@cubinghub.com", "Admin", UserRole.ROLE_ADMIN, UserStatus.ACTIVE);
        Post post = TestFixtures.createPost(10L, author, PostCategory.FREE, "제목", "본문");

        when(userRepository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));
        when(postRepository.findById(post.getId())).thenReturn(Optional.of(post));

        postService.deletePost(post.getId(), admin.getEmail());

        verify(postRepository).delete(post);
    }

    @Test
    @DisplayName("첨부 이미지가 있는 게시글 삭제는 커밋 후 원격 이미지를 삭제한다")
    void should_delete_post_attachments_after_commit_when_post_has_attachments() {
        User author = TestFixtures.createUser(1L, "author@cubinghub.com", "Author", UserRole.ROLE_USER, UserStatus.ACTIVE);
        Post post = TestFixtures.createPost(10L, author, PostCategory.FREE, "제목", "본문");
        PostAttachment attachment = createAttachment(1L, post, "attachment-key");

        when(userRepository.findByEmail(author.getEmail())).thenReturn(Optional.of(author));
        when(postRepository.findById(post.getId())).thenReturn(Optional.of(post));
        when(postAttachmentRepository.findAllByPostIdOrderByDisplayOrderAscIdAsc(post.getId())).thenReturn(List.of(attachment));

        withTransactionSynchronization(
                () -> postService.deletePost(post.getId(), author.getEmail()),
                synchronizations -> synchronizations.forEach(TransactionSynchronization::afterCommit)
        );

        verify(postAttachmentRepository).deleteAll(List.of(attachment));
        verify(postImageStorageService).delete("attachment-key");
        verify(postRepository).delete(post);
    }

    @Test
    @DisplayName("트랜잭션 동기화가 없으면 삭제 대상 첨부 이미지는 afterCommit 삭제를 등록하지 않는다")
    void should_not_register_after_commit_deletion_when_transaction_synchronization_is_inactive() {
        User author = TestFixtures.createUser(1L, "author@cubinghub.com", "Author", UserRole.ROLE_USER, UserStatus.ACTIVE);
        Post post = TestFixtures.createPost(10L, author, PostCategory.FREE, "제목", "본문");
        PostAttachment attachment = createAttachment(1L, post, "attachment-key");

        when(userRepository.findByEmail(author.getEmail())).thenReturn(Optional.of(author));
        when(postRepository.findById(post.getId())).thenReturn(Optional.of(post));
        when(postAttachmentRepository.findAllByPostIdOrderByDisplayOrderAscIdAsc(post.getId())).thenReturn(List.of(attachment));

        postService.deletePost(post.getId(), author.getEmail());

        verify(postAttachmentRepository).deleteAll(List.of(attachment));
        verify(postImageStorageService, never()).delete("attachment-key");
    }

    @Test
    @DisplayName("삭제할 첨부 이미지가 없으면 afterCommit 삭제를 등록하지 않는다")
    void should_not_register_after_commit_deletion_when_no_attachments_exist() {
        User author = TestFixtures.createUser(1L, "author@cubinghub.com", "Author", UserRole.ROLE_USER, UserStatus.ACTIVE);
        Post post = TestFixtures.createPost(10L, author, PostCategory.FREE, "제목", "본문");

        when(userRepository.findByEmail(author.getEmail())).thenReturn(Optional.of(author));
        when(postRepository.findById(post.getId())).thenReturn(Optional.of(post));
        when(postAttachmentRepository.findAllByPostIdOrderByDisplayOrderAscIdAsc(post.getId())).thenReturn(List.of());

        withTransactionSynchronization(
                () -> postService.deletePost(post.getId(), author.getEmail()),
                synchronizations -> assertThat(synchronizations).isEmpty()
        );

        verify(postRepository).delete(post);
        verify(postImageStorageService, never()).delete(any());
    }

    @Test
    @DisplayName("게시글 삭제 시 사용자가 없으면 401 예외를 반환한다")
    void should_throw_unauthorized_exception_when_user_does_not_exist_on_delete() {
        when(userRepository.findByEmail("missing@cubinghub.com")).thenReturn(Optional.empty());

        Throwable thrown = catchThrowable(() -> postService.deletePost(10L, "missing@cubinghub.com"));

        assertThat(thrown).isInstanceOf(CustomApiException.class);
        CustomApiException exception = (CustomApiException) thrown;
        assertThat(exception.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(exception.getMessage()).isEqualTo("사용자를 찾을 수 없습니다.");
    }

    @Test
    @DisplayName("게시글 삭제 시 대상 게시글이 없으면 404 예외를 반환한다")
    void should_throw_not_found_exception_when_post_is_missing_on_delete() {
        User author = TestFixtures.createUser(1L, "author@cubinghub.com", "Author", UserRole.ROLE_USER, UserStatus.ACTIVE);

        when(userRepository.findByEmail(author.getEmail())).thenReturn(Optional.of(author));
        when(postRepository.findById(999L)).thenReturn(Optional.empty());

        Throwable thrown = catchThrowable(() -> postService.deletePost(999L, author.getEmail()));

        assertThat(thrown).isInstanceOf(CustomApiException.class);
        CustomApiException exception = (CustomApiException) thrown;
        assertThat(exception.getStatus()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(exception.getMessage()).isEqualTo("게시글을 찾을 수 없습니다.");
    }

    private PostAttachment createAttachment(Long id, Post post, String objectKey) {
        PostAttachment attachment = PostAttachment.builder()
                .post(post)
                .objectKey(objectKey)
                .imageUrl("https://cdn/" + objectKey)
                .originalFileName(objectKey + ".png")
                .contentType("image/png")
                .fileSizeBytes(100L)
                .displayOrder(0)
                .build();
        ReflectionTestUtils.setField(attachment, "id", id);
        return attachment;
    }

    private void withTransactionSynchronization(Runnable action, Consumer<List<TransactionSynchronization>> assertions) {
        TransactionSynchronizationManager.initSynchronization();
        try {
            action.run();
            assertions.accept(List.copyOf(TransactionSynchronizationManager.getSynchronizations()));
        } finally {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }
}
