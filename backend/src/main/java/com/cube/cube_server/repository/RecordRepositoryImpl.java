package com.cube.cube_server.repository;

import com.cube.cube_server.domain.Record;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
@RequiredArgsConstructor
public class RecordRepositoryImpl implements RecordRepository {

    private final EntityManager em;

    @Override
    public void save(Record record) {
        em.persist(record);
    }

    @Override
    public Record findOne(Long id) {
        return em.find(Record.class, id);
    }

    @Override
    public List<Record> findByMemberId(String memberId) {
        return em.createQuery(
                        "select r from Record r join fetch r.member m where m.id = :memberId order by r.createTime desc", Record.class)
                .setParameter("memberId", memberId)
                .getResultList();
    }

    @Override
    public void remove(Record record) {
        em.remove(record);
    }
}