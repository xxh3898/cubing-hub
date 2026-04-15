package com.cubinghub.domain.post.service;

import com.cubinghub.common.exception.CustomApiException;
import com.cubinghub.domain.post.dto.request.CommentCreateRequest;
import com.cubinghub.domain.post.dto.response.CommentListItemResponse;
import com.cubinghub.domain.post.dto.response.CommentPageResponse;
import com.cubinghub.domain.post.entity.Comment;
import com.cubinghub.domain.post.entity.Post;
import com.cubinghub.domain.post.repository.CommentRepository;
import com.cubinghub.domain.post.repository.PostRepository;
import com.cubinghub.domain.user.entity.User;
import com.cubinghub.domain.user.entity.UserRole;
import com.cubinghub.domain.user.repository.UserRepository;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CommentService {

    private final CommentRepository commentRepository;
    private final PostRepository postRepository;
    private final UserRepository userRepository;

    public CommentPageResponse getComments(Long postId, Integer page, Integer size) {
        validatePageRequest(page, size);
        validatePostExists(postId);

        Page<Comment> comments = commentRepository.findByPostIdOrderByCreatedAtDesc(
                postId,
                PageRequest.of(page - 1, size)
        );
        List<CommentListItemResponse> items = new ArrayList<>(comments.getNumberOfElements());

        for (Comment comment : comments.getContent()) {
            items.add(CommentListItemResponse.from(comment));
        }

        return new CommentPageResponse(
                items,
                page,
                size,
                comments.getTotalElements(),
                comments.getTotalPages(),
                comments.hasNext(),
                comments.hasPrevious()
        );
    }

    @Transactional
    public Long createComment(Long postId, String email, CommentCreateRequest request) {
        Post post = findPostById(postId);
        User user = findUserByEmail(email);

        Comment comment = Comment.builder()
                .post(post)
                .user(user)
                .content(request.getContent())
                .build();

        return commentRepository.save(comment).getId();
    }

    @Transactional
    public void deleteComment(Long postId, Long commentId, String email) {
        User currentUser = findUserByEmail(email);
        Comment comment = commentRepository.findWithPostAndUserById(commentId)
                .orElseThrow(() -> new CustomApiException("댓글을 찾을 수 없습니다.", HttpStatus.NOT_FOUND));

        if (!comment.getPost().getId().equals(postId)) {
            throw new CustomApiException("댓글을 찾을 수 없습니다.", HttpStatus.NOT_FOUND);
        }

        validateOwnershipOrAdmin(comment, currentUser);
        commentRepository.delete(comment);
    }

    private User findUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + email));
    }

    private Post findPostById(Long postId) {
        return postRepository.findById(postId)
                .orElseThrow(() -> new CustomApiException("게시글을 찾을 수 없습니다.", HttpStatus.NOT_FOUND));
    }

    private void validatePostExists(Long postId) {
        if (!postRepository.existsById(postId)) {
            throw new CustomApiException("게시글을 찾을 수 없습니다.", HttpStatus.NOT_FOUND);
        }
    }

    private void validateOwnershipOrAdmin(Comment comment, User currentUser) {
        if (currentUser.getRole() == UserRole.ROLE_ADMIN) {
            return;
        }

        if (!comment.getUser().getId().equals(currentUser.getId())) {
            throw new CustomApiException("댓글 삭제 권한이 없습니다.", HttpStatus.FORBIDDEN);
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
