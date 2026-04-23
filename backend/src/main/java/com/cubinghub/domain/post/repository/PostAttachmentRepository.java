package com.cubinghub.domain.post.repository;

import com.cubinghub.domain.post.entity.PostAttachment;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PostAttachmentRepository extends JpaRepository<PostAttachment, Long> {

    List<PostAttachment> findAllByPostIdOrderByDisplayOrderAscIdAsc(Long postId);
}
