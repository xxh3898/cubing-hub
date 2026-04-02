package com.cubinghub.domain.post;

import com.cubinghub.common.exception.CustomApiException;
import com.cubinghub.domain.post.dto.PostCreateRequest;
import com.cubinghub.domain.post.dto.PostDetailResponse;
import com.cubinghub.domain.post.dto.PostListItemResponse;
import com.cubinghub.domain.post.dto.PostUpdateRequest;
import com.cubinghub.domain.user.User;
import com.cubinghub.domain.user.UserRepository;
import com.cubinghub.domain.user.UserRole;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PostService {

    private final PostRepository postRepository;
    private final UserRepository userRepository;

    @Transactional
    public Long createPost(String email, PostCreateRequest request) {
        User user = findUserByEmail(email);

        Post post = Post.builder()
                .user(user)
                .category(request.getCategory())
                .title(request.getTitle())
                .content(request.getContent())
                .build();

        return postRepository.save(post).getId();
    }

    public List<PostListItemResponse> getPosts(String keyword, String author) {
        return postRepository.search(keyword, author);
    }

    @Transactional
    public PostDetailResponse getPost(Long postId) {
        Post post = findPostById(postId);
        post.increaseViewCount();

        return PostDetailResponse.from(post);
    }

    @Transactional
    public void updatePost(Long postId, String email, PostUpdateRequest request) {
        User currentUser = findUserByEmail(email);
        Post post = findPostById(postId);

        validateOwnershipOrAdmin(post, currentUser);
        post.update(request.getCategory(), request.getTitle(), request.getContent());
    }

    @Transactional
    public void deletePost(Long postId, String email) {
        User currentUser = findUserByEmail(email);
        Post post = findPostById(postId);

        validateOwnershipOrAdmin(post, currentUser);
        postRepository.delete(post);
    }

    private User findUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + email));
    }

    private Post findPostById(Long postId) {
        return postRepository.findById(postId)
                .orElseThrow(() -> new CustomApiException("게시글을 찾을 수 없습니다.", HttpStatus.NOT_FOUND));
    }

    private void validateOwnershipOrAdmin(Post post, User currentUser) {
        if (currentUser.getRole() == UserRole.ROLE_ADMIN) {
            return;
        }

        if (!post.getUser().getId().equals(currentUser.getId())) {
            throw new CustomApiException("게시글 수정/삭제 권한이 없습니다.", HttpStatus.FORBIDDEN);
        }
    }
}
