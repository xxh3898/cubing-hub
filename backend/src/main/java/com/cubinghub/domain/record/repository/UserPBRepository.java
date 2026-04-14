package com.cubinghub.domain.record.repository;

import com.cubinghub.domain.record.entity.EventType;
import com.cubinghub.domain.record.entity.UserPB;
import com.cubinghub.domain.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserPBRepository extends JpaRepository<UserPB, Long>, UserPBRepositoryCustom {
    Optional<UserPB> findByUserAndEventType(User user, EventType eventType);
}
