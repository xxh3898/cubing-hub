package com.cube.cube_server.repository;

import com.cube.cube_server.entity.Member;

import java.util.List;

public interface MemberRepository {
    void save(Member member);

    Member findOne(String id);

    List<Member> findAll();
}