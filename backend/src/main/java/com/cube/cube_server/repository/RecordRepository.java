package com.cube.cube_server.repository;

import com.cube.cube_server.domain.Record;

import java.util.List;

public interface RecordRepository {
    void save(Record record);

    Record findOne(Long id);

    List<Record> findByMemberId(String memberId);

    void remove(Record record);
}