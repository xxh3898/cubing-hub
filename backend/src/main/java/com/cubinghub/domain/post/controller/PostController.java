package com.cubinghub.domain.post.controller;

import com.cubinghub.common.response.ApiResponse;
import com.cubinghub.domain.post.dto.PostCreateRequest;
import com.cubinghub.domain.post.dto.PostDetailResponse;
import com.cubinghub.domain.post.dto.PostListItemResponse;
import com.cubinghub.domain.post.dto.PostUpdateRequest;
import com.cubinghub.domain.post.service.PostService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/posts")
@RequiredArgsConstructor
public class PostController {

    private final PostService postService;

    @PostMapping
    public ResponseEntity<ApiResponse<Void>> createPost(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody @Valid PostCreateRequest request
    ) {
        Long postId = postService.createPost(userDetails.getUsername(), request);
        return ResponseEntity.created(URI.create("/api/posts/" + postId)).body(ApiResponse.success());
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<PostListItemResponse>>> getPosts(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String author
    ) {
        return ResponseEntity.ok(ApiResponse.success(postService.getPosts(keyword, author)));
    }

    @GetMapping("/{postId}")
    public ResponseEntity<ApiResponse<PostDetailResponse>> getPost(@PathVariable Long postId) {
        return ResponseEntity.ok(ApiResponse.success(postService.getPost(postId)));
    }

    @PutMapping("/{postId}")
    public ResponseEntity<ApiResponse<Void>> updatePost(
            @PathVariable Long postId,
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody @Valid PostUpdateRequest request
    ) {
        postService.updatePost(postId, userDetails.getUsername(), request);
        return ResponseEntity.ok(ApiResponse.success());
    }

    @DeleteMapping("/{postId}")
    public ResponseEntity<ApiResponse<Void>> deletePost(
            @PathVariable Long postId,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        postService.deletePost(postId, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success());
    }
}
