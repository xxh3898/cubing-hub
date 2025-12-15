package com.cube.cube_server.repository;

import com.cube.cube_server.domain.Record;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RecordRepository extends JpaRepository<Record, Long> {
    List<Record> findByMemberId(String memberId);
}