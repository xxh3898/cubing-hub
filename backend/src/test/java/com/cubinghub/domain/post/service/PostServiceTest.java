package com.cubinghub.domain.post.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.cubinghub.common.exception.CustomApiException;
import com.cubinghub.domain.post.dto.request.PostCreateRequest;
import com.cubinghub.domain.post.dto.request.PostUpdateRequest;
import com.cubinghub.domain.post.dto.response.PostDetailResponse;
import com.cubinghub.domain.post.dto.response.PostListItemResponse;
import com.cubinghub.domain.post.dto.response.PostPageResponse;
import com.cubinghub.domain.post.entity.Post;
import com.cubinghub.domain.post.entity.PostCategory;
import com.cubinghub.domain.post.repository.PostRepository;
import com.cubinghub.domain.post.repository.PostSearchResult;
import com.cubinghub.domain.user.entity.User;
import com.cubinghub.domain.user.entity.UserRole;
import com.cubinghub.domain.user.entity.UserStatus;
import com.cubinghub.domain.user.repository.UserRepository;
import com.cubinghub.support.TestFixtures;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

@ExtendWith(MockitoExtension.class)
@DisplayName("PostService 단위 테스트")
class PostServiceTest {

    @Mock
    private PostRepository postRepository;

    @Mock
    private UserRepository userRepository;

    private PostService postService;

    @BeforeEach
    void setUp() {
        postService = new PostService(postRepository, userRepository);
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
    @DisplayName("게시글 생성 시 작성자가 없으면 실패한다")
    void should_throw_illegal_argument_exception_when_user_does_not_exist_on_create() {
        when(userRepository.findByEmail("missing@cubinghub.com")).thenReturn(Optional.empty());

        Throwable thrown = catchThrowable(() ->
                postService.createPost(
                        "missing@cubinghub.com",
                        new PostCreateRequest(PostCategory.FREE, "제목", "본문")
                )
        );

        assertThat(thrown)
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("User not found: missing@cubinghub.com");
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
    @DisplayName("게시글 목록 조회 시 page가 1보다 작으면 실패한다")
    void should_throw_illegal_argument_exception_when_page_is_less_than_one() {
        Throwable thrown = catchThrowable(() -> postService.getPosts(null, null, null, 0, 8));

        assertThat(thrown)
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("page는 1 이상이어야 합니다.");
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
    @DisplayName("게시글 상세 조회 시 조회수를 증가시키고 응답으로 매핑한다")
    void should_increase_view_count_and_return_detail_response_when_post_exists() {
        User author = TestFixtures.createUser(1L, "author@cubinghub.com", "Author", UserRole.ROLE_USER, UserStatus.ACTIVE);
        Post post = TestFixtures.createPost(10L, author, PostCategory.FREE, "제목", "본문");

        when(postRepository.findWithUserById(post.getId())).thenReturn(Optional.of(post));

        PostDetailResponse response = postService.getPost(post.getId());

        assertThat(post.getViewCount()).isEqualTo(1);
        assertThat(response.getId()).isEqualTo(post.getId());
        assertThat(response.getTitle()).isEqualTo("제목");
        assertThat(response.getAuthorNickname()).isEqualTo("Author");
        assertThat(response.getViewCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("작성자는 자신의 게시글을 수정할 수 있다")
    void should_update_post_when_author_updates_own_post() {
        User author = TestFixtures.createUser(1L, "author@cubinghub.com", "Author", UserRole.ROLE_USER, UserStatus.ACTIVE);
        Post post = TestFixtures.createPost(10L, author, PostCategory.FREE, "제목", "본문");
        PostUpdateRequest request = new PostUpdateRequest(PostCategory.NOTICE, "수정 제목", "수정 본문");

        when(userRepository.findByEmail(author.getEmail())).thenReturn(Optional.of(author));
        when(postRepository.findById(post.getId())).thenReturn(Optional.of(post));

        postService.updatePost(post.getId(), author.getEmail(), request);

        assertThat(post.getCategory()).isEqualTo(PostCategory.NOTICE);
        assertThat(post.getTitle()).isEqualTo("수정 제목");
        assertThat(post.getContent()).isEqualTo("수정 본문");
    }

    @Test
    @DisplayName("게시글 수정 시 사용자가 없으면 실패한다")
    void should_throw_illegal_argument_exception_when_user_does_not_exist_on_update() {
        when(userRepository.findByEmail("missing@cubinghub.com")).thenReturn(Optional.empty());

        Throwable thrown = catchThrowable(() ->
                postService.updatePost(
                        10L,
                        "missing@cubinghub.com",
                        new PostUpdateRequest(PostCategory.FREE, "수정 제목", "수정 본문")
                )
        );

        assertThat(thrown)
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("User not found: missing@cubinghub.com");
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
    @DisplayName("게시글 삭제 시 사용자가 없으면 실패한다")
    void should_throw_illegal_argument_exception_when_user_does_not_exist_on_delete() {
        when(userRepository.findByEmail("missing@cubinghub.com")).thenReturn(Optional.empty());

        Throwable thrown = catchThrowable(() -> postService.deletePost(10L, "missing@cubinghub.com"));

        assertThat(thrown)
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("User not found: missing@cubinghub.com");
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
}
