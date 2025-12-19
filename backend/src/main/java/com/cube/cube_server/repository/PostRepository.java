package com.cube.cube_server.repository;

import com.cube.cube_server.domain.Post;

import java.util.List;

public interface PostRepository {
    void save(Post post);

    Post findOne(Long id);

    List<Post> findAll();

    List<Post> findAllDesc();

    List<Post> findByMemberId(String memberId);

    void remove(Post post);
}