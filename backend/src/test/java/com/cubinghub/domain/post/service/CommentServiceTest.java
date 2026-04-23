package com.cubinghub.domain.post.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.cubinghub.common.exception.CustomApiException;
import com.cubinghub.domain.post.dto.request.CommentCreateRequest;
import com.cubinghub.domain.post.dto.response.CommentPageResponse;
import com.cubinghub.domain.post.entity.Comment;
import com.cubinghub.domain.post.entity.Post;
import com.cubinghub.domain.post.entity.PostCategory;
import com.cubinghub.domain.post.repository.CommentRepository;
import com.cubinghub.domain.post.repository.PostRepository;
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
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
@DisplayName("CommentService 단위 테스트")
class CommentServiceTest {

    @Mock
    private CommentRepository commentRepository;

    @Mock
    private PostRepository postRepository;

    @Mock
    private UserRepository userRepository;

    private CommentService commentService;

    @BeforeEach
    void setUp() {
        commentService = new CommentService(commentRepository, postRepository, userRepository);
    }

    @Test
    @DisplayName("댓글 목록 조회는 최신순 페이지 응답을 반환한다")
    void should_return_paginated_comments_when_post_exists() {
        User author = TestFixtures.createUser(1L, "author@cubinghub.com", "Author", UserRole.ROLE_USER, UserStatus.ACTIVE);
        Post post = TestFixtures.createPost(10L, author, PostCategory.FREE, "제목", "본문");
        Comment firstComment = createComment(21L, post, author, "첫 댓글");
        Comment secondComment = createComment(20L, post, author, "둘째 댓글");

        when(postRepository.existsById(post.getId())).thenReturn(true);
        when(commentRepository.findByPostIdOrderByCreatedAtDesc(eq(post.getId()), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(firstComment, secondComment), PageRequest.of(0, 5), 7));

        CommentPageResponse response = commentService.getComments(post.getId(), 1, 5);

        assertThat(response.getItems()).hasSize(2);
        assertThat(response.getItems().get(0).getId()).isEqualTo(firstComment.getId());
        assertThat(response.getItems().get(0).getAuthorNickname()).isEqualTo("Author");
        assertThat(response.getPage()).isEqualTo(1);
        assertThat(response.getSize()).isEqualTo(5);
        assertThat(response.getTotalElements()).isEqualTo(7);
        assertThat(response.getTotalPages()).isEqualTo(2);
        assertThat(response.isHasNext()).isTrue();
        assertThat(response.isHasPrevious()).isFalse();
    }

    @Test
    @DisplayName("댓글 목록 조회 시 게시글이 없으면 404 예외를 반환한다")
    void should_throw_not_found_exception_when_post_is_missing_on_get_comments() {
        when(postRepository.existsById(999L)).thenReturn(false);

        Throwable thrown = catchThrowable(() -> commentService.getComments(999L, 1, 5));

        assertThat(thrown).isInstanceOf(CustomApiException.class);
        CustomApiException exception = (CustomApiException) thrown;
        assertThat(exception.getStatus()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(exception.getMessage()).isEqualTo("게시글을 찾을 수 없습니다.");
    }

    @Test
    @DisplayName("댓글 생성 시 게시글과 작성자를 연결해 저장한다")
    void should_create_comment_when_post_and_user_exist() {
        User author = TestFixtures.createUser(1L, "author@cubinghub.com", "Author", UserRole.ROLE_USER, UserStatus.ACTIVE);
        Post post = TestFixtures.createPost(10L, author, PostCategory.FREE, "제목", "본문");
        Comment savedComment = createComment(30L, post, author, "댓글 본문");

        when(postRepository.findById(post.getId())).thenReturn(Optional.of(post));
        when(userRepository.findByEmail(author.getEmail())).thenReturn(Optional.of(author));
        when(commentRepository.save(any(Comment.class))).thenReturn(savedComment);

        Long commentId = commentService.createComment(post.getId(), author.getEmail(), new CommentCreateRequest("댓글 본문"));

        ArgumentCaptor<Comment> commentCaptor = ArgumentCaptor.forClass(Comment.class);
        verify(commentRepository).save(commentCaptor.capture());

        assertThat(commentId).isEqualTo(savedComment.getId());
        assertThat(commentCaptor.getValue().getPost()).isEqualTo(post);
        assertThat(commentCaptor.getValue().getUser()).isEqualTo(author);
        assertThat(commentCaptor.getValue().getContent()).isEqualTo("댓글 본문");
    }

    @Test
    @DisplayName("댓글 생성 시 사용자가 없으면 401 예외를 반환한다")
    void should_throw_unauthorized_exception_when_user_does_not_exist_on_create_comment() {
        User author = TestFixtures.createUser(1L, "author@cubinghub.com", "Author", UserRole.ROLE_USER, UserStatus.ACTIVE);
        Post post = TestFixtures.createPost(10L, author, PostCategory.FREE, "제목", "본문");

        when(postRepository.findById(post.getId())).thenReturn(Optional.of(post));
        when(userRepository.findByEmail("missing@cubinghub.com")).thenReturn(Optional.empty());

        Throwable thrown = catchThrowable(() ->
                commentService.createComment(post.getId(), "missing@cubinghub.com", new CommentCreateRequest("댓글 본문"))
        );

        assertThat(thrown).isInstanceOf(CustomApiException.class);
        CustomApiException exception = (CustomApiException) thrown;
        assertThat(exception.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(exception.getMessage()).isEqualTo("사용자를 찾을 수 없습니다.");
    }

    @Test
    @DisplayName("댓글 삭제 시 작성자는 자신의 댓글을 삭제할 수 있다")
    void should_delete_comment_when_author_deletes_own_comment() {
        User author = TestFixtures.createUser(1L, "author@cubinghub.com", "Author", UserRole.ROLE_USER, UserStatus.ACTIVE);
        Post post = TestFixtures.createPost(10L, author, PostCategory.FREE, "제목", "본문");
        Comment comment = createComment(30L, post, author, "댓글 본문");

        when(userRepository.findByEmail(author.getEmail())).thenReturn(Optional.of(author));
        when(commentRepository.findWithPostAndUserById(comment.getId())).thenReturn(Optional.of(comment));

        commentService.deleteComment(post.getId(), comment.getId(), author.getEmail());

        verify(commentRepository).delete(comment);
    }

    @Test
    @DisplayName("댓글 삭제 시 관리자는 다른 사용자의 댓글을 삭제할 수 있다")
    void should_delete_comment_when_admin_deletes_other_users_comment() {
        User author = TestFixtures.createUser(1L, "author@cubinghub.com", "Author", UserRole.ROLE_USER, UserStatus.ACTIVE);
        User admin = TestFixtures.createUser(99L, "admin@cubinghub.com", "Admin", UserRole.ROLE_ADMIN, UserStatus.ACTIVE);
        Post post = TestFixtures.createPost(10L, author, PostCategory.FREE, "제목", "본문");
        Comment comment = createComment(30L, post, author, "댓글 본문");

        when(userRepository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));
        when(commentRepository.findWithPostAndUserById(comment.getId())).thenReturn(Optional.of(comment));

        commentService.deleteComment(post.getId(), comment.getId(), admin.getEmail());

        verify(commentRepository).delete(comment);
    }

    @Test
    @DisplayName("일반 사용자는 다른 사용자의 댓글을 삭제할 수 없다")
    void should_throw_forbidden_exception_when_non_author_deletes_comment() {
        User author = TestFixtures.createUser(1L, "author@cubinghub.com", "Author", UserRole.ROLE_USER, UserStatus.ACTIVE);
        User otherUser = TestFixtures.createUser(2L, "other@cubinghub.com", "Other", UserRole.ROLE_USER, UserStatus.ACTIVE);
        Post post = TestFixtures.createPost(10L, author, PostCategory.FREE, "제목", "본문");
        Comment comment = createComment(30L, post, author, "댓글 본문");

        when(userRepository.findByEmail(otherUser.getEmail())).thenReturn(Optional.of(otherUser));
        when(commentRepository.findWithPostAndUserById(comment.getId())).thenReturn(Optional.of(comment));

        Throwable thrown = catchThrowable(() -> commentService.deleteComment(post.getId(), comment.getId(), otherUser.getEmail()));

        assertThat(thrown).isInstanceOf(CustomApiException.class);
        CustomApiException exception = (CustomApiException) thrown;
        assertThat(exception.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(exception.getMessage()).isEqualTo("댓글 삭제 권한이 없습니다.");
    }

    @Test
    @DisplayName("댓글 삭제 시 사용자가 없으면 401 예외를 반환한다")
    void should_throw_unauthorized_exception_when_user_does_not_exist_on_delete_comment() {
        when(userRepository.findByEmail("missing@cubinghub.com")).thenReturn(Optional.empty());

        Throwable thrown = catchThrowable(() ->
                commentService.deleteComment(10L, 30L, "missing@cubinghub.com")
        );

        assertThat(thrown).isInstanceOf(CustomApiException.class);
        CustomApiException exception = (CustomApiException) thrown;
        assertThat(exception.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(exception.getMessage()).isEqualTo("사용자를 찾을 수 없습니다.");
    }

    @Test
    @DisplayName("댓글 목록 조회 시 page가 1보다 작으면 실패한다")
    void should_throw_illegal_argument_exception_when_comment_page_is_less_than_one() {
        Throwable thrown = catchThrowable(() -> commentService.getComments(10L, 0, 5));

        assertThat(thrown)
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("잘못된 페이지 번호입니다.");
    }

    private Comment createComment(Long id, Post post, User user, String content) {
        Comment comment = Comment.builder()
                .post(post)
                .user(user)
                .content(content)
                .build();

        ReflectionTestUtils.setField(comment, "id", id);
        return comment;
    }
}
