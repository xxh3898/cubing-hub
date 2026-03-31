package com.cubinghub.domain.record;

import com.cubinghub.domain.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserPBRepository extends JpaRepository<UserPB, Long> {
    Optional<UserPB> findByUserAndEventType(User user, EventType eventType);
}
