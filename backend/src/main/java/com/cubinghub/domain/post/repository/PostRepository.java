package com.cubinghub.domain.post.repository;

import com.cubinghub.domain.post.entity.Post;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PostRepository extends JpaRepository<Post, Long>, PostRepositoryCustom {

    @EntityGraph(attributePaths = "user")
    Optional<Post> findWithUserById(Long id);
}
