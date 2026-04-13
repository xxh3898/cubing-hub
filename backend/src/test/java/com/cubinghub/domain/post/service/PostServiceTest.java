package com.cubinghub.domain.post.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.cubinghub.common.exception.CustomApiException;
import com.cubinghub.domain.post.entity.Post;
import com.cubinghub.domain.post.entity.PostCategory;
import com.cubinghub.domain.post.repository.PostRepository;
import com.cubinghub.domain.user.entity.User;
import com.cubinghub.domain.user.entity.UserRole;
import com.cubinghub.domain.user.entity.UserStatus;
import com.cubinghub.domain.user.repository.UserRepository;
import com.cubinghub.support.TestFixtures;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
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
    @DisplayName("존재하지 않는 게시글 상세 조회는 404 예외를 반환한다")
    void should_throw_not_found_exception_when_post_does_not_exist() {
        // given
        when(postRepository.findWithUserById(999L)).thenReturn(Optional.empty());

        // when
        Throwable thrown = catchThrowable(() -> postService.getPost(999L));

        // then
        assertThat(thrown).isInstanceOf(CustomApiException.class);
        CustomApiException exception = (CustomApiException) thrown;
        assertThat(exception.getStatus()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(exception.getMessage()).isEqualTo("게시글을 찾을 수 없습니다.");
    }

    @Test
    @DisplayName("일반 사용자는 다른 사용자의 게시글을 수정할 수 없다")
    void should_throw_forbidden_exception_when_non_author_updates_post() {
        // given
        User author = TestFixtures.createUser(1L, "author@cubinghub.com", "Author", UserRole.ROLE_USER, UserStatus.ACTIVE);
        User otherUser = TestFixtures.createUser(2L, "other@cubinghub.com", "Other", UserRole.ROLE_USER, UserStatus.ACTIVE);
        Post post = TestFixtures.createPost(10L, author, PostCategory.FREE, "제목", "본문");

        when(userRepository.findByEmail(otherUser.getEmail())).thenReturn(Optional.of(otherUser));
        when(postRepository.findById(post.getId())).thenReturn(Optional.of(post));

        // when
        Throwable thrown = catchThrowable(() ->
                postService.updatePost(
                        post.getId(),
                        otherUser.getEmail(),
                        new com.cubinghub.domain.post.dto.request.PostUpdateRequest(PostCategory.FREE, "수정 제목", "수정 본문")
                )
        );

        // then
        assertThat(thrown).isInstanceOf(CustomApiException.class);
        CustomApiException exception = (CustomApiException) thrown;
        assertThat(exception.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(exception.getMessage()).isEqualTo("게시글 수정/삭제 권한이 없습니다.");
    }

    @Test
    @DisplayName("관리자는 다른 사용자의 게시글을 삭제할 수 있다")
    void should_delete_post_when_admin_deletes_other_users_post() {
        // given
        User author = TestFixtures.createUser(1L, "author@cubinghub.com", "Author", UserRole.ROLE_USER, UserStatus.ACTIVE);
        User admin = TestFixtures.createUser(99L, "admin@cubinghub.com", "Admin", UserRole.ROLE_ADMIN, UserStatus.ACTIVE);
        Post post = TestFixtures.createPost(10L, author, PostCategory.FREE, "제목", "본문");

        when(userRepository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));
        when(postRepository.findById(post.getId())).thenReturn(Optional.of(post));

        // when
        postService.deletePost(post.getId(), admin.getEmail());

        // then
        verify(postRepository).delete(post);
    }
}
