package com.cubinghub.domain.post.repository;

import com.cubinghub.domain.post.entity.PostView;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PostViewRepository extends JpaRepository<PostView, Long> {

    boolean existsByPostIdAndUserId(Long postId, Long userId);

    void deleteAllByPostId(Long postId);
}
