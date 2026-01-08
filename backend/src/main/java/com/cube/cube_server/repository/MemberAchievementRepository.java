package com.cube.cube_server.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.cube.cube_server.domain.MemberAchievement;

public interface MemberAchievementRepository extends JpaRepository<MemberAchievement, Long> {
}
