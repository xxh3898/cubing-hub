package com.cubinghub.domain.post.controller;

import com.cubinghub.common.response.ApiResponse;
import com.cubinghub.common.response.IdResponse;
import com.cubinghub.domain.post.dto.request.CommentCreateRequest;
import com.cubinghub.domain.post.dto.response.CommentPageResponse;
import com.cubinghub.domain.post.service.CommentService;
import jakarta.validation.Valid;
import java.net.URI;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/posts/{postId}/comments")
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;

    @GetMapping
    public ResponseEntity<ApiResponse<CommentPageResponse>> getComments(
            @PathVariable Long postId,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "5") Integer size
    ) {
        return ResponseEntity.ok(
                ApiResponse.success(HttpStatus.OK, "댓글 목록을 조회했습니다.", commentService.getComments(postId, page, size))
        );
    }

    @PostMapping
    public ResponseEntity<ApiResponse<IdResponse>> createComment(
            @PathVariable Long postId,
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody @Valid CommentCreateRequest request
    ) {
        Long commentId = commentService.createComment(postId, userDetails.getUsername(), request);
        return ResponseEntity.created(URI.create("/api/posts/" + postId + "/comments/" + commentId))
                .body(ApiResponse.success(HttpStatus.CREATED, "댓글이 생성되었습니다.", new IdResponse(commentId)));
    }

    @DeleteMapping("/{commentId}")
    public ResponseEntity<ApiResponse<Void>> deleteComment(
            @PathVariable Long postId,
            @PathVariable Long commentId,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        commentService.deleteComment(postId, commentId, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK, "댓글이 삭제되었습니다."));
    }
}
