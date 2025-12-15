package com.cube.cube_server.repository;

import com.cube.cube_server.domain.Post;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PostRepository extends JpaRepository<Post, Long> {
    List<Post> findAllByOrderByCreateTimeDesc();
}