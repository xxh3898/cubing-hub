package com.cubinghub.domain.post.service;

import com.cubinghub.common.exception.CustomApiException;
import com.cubinghub.domain.post.dto.request.PostCreateRequest;
import com.cubinghub.domain.post.dto.response.PostDetailResponse;
import com.cubinghub.domain.post.dto.response.PostPageResponse;
import com.cubinghub.domain.post.dto.request.PostUpdateRequest;
import com.cubinghub.domain.post.entity.Post;
import com.cubinghub.domain.post.entity.PostCategory;
import com.cubinghub.domain.post.repository.PostRepository;
import com.cubinghub.domain.post.repository.PostSearchResult;
import com.cubinghub.domain.user.entity.User;
import com.cubinghub.domain.user.entity.UserRole;
import com.cubinghub.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PostService {

    private final PostRepository postRepository;
    private final UserRepository userRepository;

    @Transactional
    public Long createPost(String email, PostCreateRequest request) {
        User user = findUserByEmail(email);
        validateNoticeWritePermission(request.getCategory(), user);

        Post post = Post.builder()
                .user(user)
                .category(request.getCategory())
                .title(request.getTitle())
                .content(request.getContent())
                .build();

        return postRepository.save(post).getId();
    }

    public PostPageResponse getPosts(PostCategory category, String keyword, String author, Integer page, Integer size) {
        validatePageRequest(page, size);

        PostSearchResult result = postRepository.search(category, keyword, author, (page - 1) * size, size);
        long totalElements = result.getTotalElements();
        int totalPages = totalElements == 0 ? 0 : (int) Math.ceil((double) totalElements / size);

        return new PostPageResponse(
                result.getItems(),
                page,
                size,
                totalElements,
                totalPages,
                page < totalPages,
                page > 1
        );
    }

    @Transactional
    public PostDetailResponse getPost(Long postId) {
        Post post = findPostWithUserById(postId);
        post.increaseViewCount();

        return PostDetailResponse.from(post);
    }

    @Transactional
    public void updatePost(Long postId, String email, PostUpdateRequest request) {
        User currentUser = findUserByEmail(email);
        Post post = findPostById(postId);

        validateOwnershipOrAdmin(post, currentUser);
        validateNoticeWritePermission(request.getCategory(), currentUser);
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
                .orElseThrow(() -> new CustomApiException("사용자를 찾을 수 없습니다.", HttpStatus.UNAUTHORIZED));
    }

    private Post findPostById(Long postId) {
        return postRepository.findById(postId)
                .orElseThrow(() -> new CustomApiException("게시글을 찾을 수 없습니다.", HttpStatus.NOT_FOUND));
    }

    private Post findPostWithUserById(Long postId) {
        return postRepository.findWithUserById(postId)
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

    private void validateNoticeWritePermission(PostCategory category, User currentUser) {
        if (category != PostCategory.NOTICE) {
            return;
        }

        if (currentUser.getRole() != UserRole.ROLE_ADMIN) {
            throw new CustomApiException("공지사항 작성/수정 권한이 없습니다.", HttpStatus.FORBIDDEN);
        }
    }

    private void validatePageRequest(Integer page, Integer size) {
        if (page < 1) {
            throw new IllegalArgumentException("page는 1 이상이어야 합니다.");
        }

        if (size < 1 || size > 100) {
            throw new IllegalArgumentException("size는 1 이상 100 이하여야 합니다.");
        }
    }
}
