package com.cubinghub.domain.post.repository;

import com.cubinghub.domain.post.entity.Comment;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CommentRepository extends JpaRepository<Comment, Long> {

    @EntityGraph(attributePaths = "user")
    Page<Comment> findByPostIdOrderByCreatedAtDesc(Long postId, Pageable pageable);

    @EntityGraph(attributePaths = {"post", "user"})
    Optional<Comment> findWithPostAndUserById(Long id);

    void deleteAllByPostId(Long postId);
}
