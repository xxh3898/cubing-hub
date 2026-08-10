package com.cubinghub.domain.record.repository;

import com.cubinghub.domain.record.entity.Record;
import com.cubinghub.domain.record.entity.EventType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RecordRepository extends JpaRepository<Record, Long>, RecordRepositoryCustom {
    Page<Record> findByUserIdOrderByCreatedAtDescIdDesc(Long userId, Pageable pageable);

    Page<Record> findByUserIdAndEventTypeOrderByCreatedAtDescIdDesc(
            Long userId,
            EventType eventType,
            Pageable pageable
    );

    Optional<Record> findByUserEmailAndClientSubmissionId(String email, String clientSubmissionId);
}
