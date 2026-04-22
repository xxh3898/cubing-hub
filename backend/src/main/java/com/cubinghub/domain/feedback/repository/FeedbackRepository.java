package com.cubinghub.domain.feedback.repository;

import com.cubinghub.domain.feedback.entity.Feedback;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FeedbackRepository extends JpaRepository<Feedback, Long> {

    @EntityGraph(attributePaths = "user")
    Optional<Feedback> findWithUserById(Long id);
}
