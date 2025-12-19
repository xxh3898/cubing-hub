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
    public ResponseEntity<String> write(@RequestBody PostDto.Create request, @RequestParam String memberId) {
        Long postId = postService.write(request, memberId);
        return ResponseEntity.ok("게시글 작성 완료! ID: " + postId);
    }

    @GetMapping
    public ResponseEntity<List<PostDto.Response>> findAll() {
        List<PostDto.Response> posts = postService.findAll();
        return ResponseEntity.ok(posts);
    }

    @GetMapping("/{id}")
    public ResponseEntity<PostDto.Response> findById(@PathVariable Long id) {
        return ResponseEntity.ok(postService.findById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Long> update(@PathVariable Long id, @RequestBody PostDto.Update request) {
        return ResponseEntity.ok(postService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<String> delete(@PathVariable Long id) {
        postService.delete(id);
        return ResponseEntity.ok("삭제 완료");
    }
}