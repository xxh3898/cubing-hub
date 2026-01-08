package com.cube.cube_server.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.cube.cube_server.dto.PostDto;
import com.cube.cube_server.service.PostService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/posts")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class PostController {

    private final PostService postService;

    @PostMapping
    public ResponseEntity<String> write(@RequestBody PostDto.Create request) {
        Long postId = postService.write(request, com.cube.cube_server.security.SecurityUtil.getCurrentMemberId());
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
        // 본인 확인 로직 추가 가능 (Service 레벨 권장)
        return ResponseEntity.ok(postService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<String> delete(@PathVariable Long id) {
        // 본인 확인 로직 추가 가능 (Service 레벨 권장)
        postService.delete(id);
        return ResponseEntity.ok("삭제 완료");
    }
}
