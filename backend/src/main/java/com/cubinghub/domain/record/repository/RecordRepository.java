package com.cubinghub.domain.record.repository;

import com.cubinghub.domain.record.entity.Record;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RecordRepository extends JpaRepository<Record, Long>, RecordRepositoryCustom {
    List<Record> findByUserIdOrderByCreatedAtDesc(Long userId);
}
