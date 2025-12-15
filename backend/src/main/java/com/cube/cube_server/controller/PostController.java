package com.cube.cube_server.controller;

import com.cube.cube_server.dto.PostDto;
import com.cube.cube_server.service.PostService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/posts")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class PostController {

    private final PostService postService;

    @PostMapping
    public ResponseEntity<String> write(@RequestBody PostDto postDto, @RequestParam String memberId) {
        Long postId = postService.write(postDto, memberId);
        return ResponseEntity.ok("게시글 작성 완료! ID: " + postId);
    }

    @GetMapping
    public ResponseEntity<List<PostDto>> findAll() {
        List<PostDto> posts = postService.findAll();
        return ResponseEntity.ok(posts);
    }

    @GetMapping("/my")
    public ResponseEntity<List<PostDto>> findMyPosts(@RequestParam String memberId) {
        List<PostDto> myPosts = postService.findByMemberId(memberId);
        return ResponseEntity.ok(myPosts);
    }
}