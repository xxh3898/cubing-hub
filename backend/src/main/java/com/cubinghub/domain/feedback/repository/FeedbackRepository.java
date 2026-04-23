package com.cubinghub.domain.feedback.repository;

import com.cubinghub.domain.feedback.entity.Feedback;
import com.cubinghub.domain.feedback.entity.FeedbackVisibility;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FeedbackRepository extends JpaRepository<Feedback, Long> {

    @EntityGraph(attributePaths = {"user", "answeredByUser"})
    Optional<Feedback> findWithUserById(Long id);

    @EntityGraph(attributePaths = "user")
    Page<Feedback> findAllBy(Pageable pageable);

    @EntityGraph(attributePaths = "user")
    Page<Feedback> findByAnswerIsNull(Pageable pageable);

    @EntityGraph(attributePaths = "user")
    Page<Feedback> findByAnswerIsNotNull(Pageable pageable);

    @EntityGraph(attributePaths = "user")
    Page<Feedback> findByVisibility(FeedbackVisibility visibility, Pageable pageable);

    @EntityGraph(attributePaths = "user")
    Page<Feedback> findByAnswerIsNullAndVisibility(FeedbackVisibility visibility, Pageable pageable);

    @EntityGraph(attributePaths = "user")
    Page<Feedback> findByAnswerIsNotNullAndVisibility(FeedbackVisibility visibility, Pageable pageable);

    Page<Feedback> findByVisibilityAndAnswerIsNotNull(FeedbackVisibility visibility, Pageable pageable);
}
