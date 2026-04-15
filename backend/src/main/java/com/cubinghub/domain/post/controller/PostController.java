package com.cubinghub.domain.post.controller;

import com.cubinghub.common.response.ApiResponse;
import com.cubinghub.common.response.IdResponse;
import com.cubinghub.domain.post.dto.request.PostCreateRequest;
import com.cubinghub.domain.post.dto.response.PostDetailResponse;
import com.cubinghub.domain.post.dto.response.PostPageResponse;
import com.cubinghub.domain.post.dto.request.PostUpdateRequest;
import com.cubinghub.domain.post.entity.PostCategory;
import com.cubinghub.domain.post.service.PostService;
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
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/posts")
@RequiredArgsConstructor
public class PostController {

    private final PostService postService;

    @PostMapping
    public ResponseEntity<ApiResponse<IdResponse>> createPost(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody @Valid PostCreateRequest request
    ) {
        Long postId = postService.createPost(userDetails.getUsername(), request);
        return ResponseEntity.created(URI.create("/api/posts/" + postId))
                .body(ApiResponse.success(HttpStatus.CREATED, "게시글이 생성되었습니다.", new IdResponse(postId)));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PostPageResponse>> getPosts(
            @RequestParam(required = false) PostCategory category,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String author,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "8") Integer size
    ) {
        return ResponseEntity.ok(
                ApiResponse.success(HttpStatus.OK, "게시글 목록을 조회했습니다.", postService.getPosts(category, keyword, author, page, size))
        );
    }

    @GetMapping("/{postId}")
    public ResponseEntity<ApiResponse<PostDetailResponse>> getPost(@PathVariable Long postId) {
        return ResponseEntity.ok(
                ApiResponse.success(HttpStatus.OK, "게시글을 조회했습니다.", postService.getPost(postId))
        );
    }

    @PutMapping("/{postId}")
    public ResponseEntity<ApiResponse<Void>> updatePost(
            @PathVariable Long postId,
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody @Valid PostUpdateRequest request
    ) {
        postService.updatePost(postId, userDetails.getUsername(), request);
        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK, "게시글이 수정되었습니다."));
    }

    @DeleteMapping("/{postId}")
    public ResponseEntity<ApiResponse<Void>> deletePost(
            @PathVariable Long postId,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        postService.deletePost(postId, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK, "게시글이 삭제되었습니다."));
    }
}
