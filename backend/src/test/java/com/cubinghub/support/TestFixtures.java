package com.cubinghub.support;

import com.cubinghub.domain.post.entity.Post;
import com.cubinghub.domain.post.entity.PostCategory;
import com.cubinghub.domain.record.entity.EventType;
import com.cubinghub.domain.record.entity.Penalty;
import com.cubinghub.domain.record.entity.Record;
import com.cubinghub.domain.user.entity.User;
import com.cubinghub.domain.user.entity.UserRole;
import com.cubinghub.domain.user.entity.UserStatus;
import com.cubinghub.security.JwtTokenProvider;
import java.time.Clock;
import java.util.Collections;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.test.util.ReflectionTestUtils;

public final class TestFixtures {

    private static final String TEST_SECRET = "testSecretKeyForTestingPurposes12345678901234";
    private static final long ACCESS_EXPIRATION = 3600000L;
    private static final long REFRESH_EXPIRATION = 604800000L;

    private TestFixtures() {
    }

    public static User createUser(Long id, String email, String nickname, UserRole role, UserStatus status) {
        User user = User.builder()
                .email(email)
                .password("encodedPassword")
                .nickname(nickname)
                .role(role)
                .status(status)
                .mainEvent("3x3x3")
                .build();

        if (id != null) {
            ReflectionTestUtils.setField(user, "id", id);
        }

        return user;
    }

    public static Post createPost(Long id, User user, PostCategory category, String title, String content) {
        Post post = Post.builder()
                .user(user)
                .category(category)
                .title(title)
                .content(content)
                .build();

        if (id != null) {
            ReflectionTestUtils.setField(post, "id", id);
        }

        return post;
    }

    public static Record createRecord(Long id, User user, EventType eventType, Integer timeMs, Penalty penalty, String scramble) {
        Record record = Record.builder()
                .user(user)
                .eventType(eventType)
                .timeMs(timeMs)
                .penalty(penalty)
                .scramble(scramble)
                .build();

        if (id != null) {
            ReflectionTestUtils.setField(record, "id", id);
        }

        return record;
    }

    public static UserDetails createUserDetails(User user) {
        return org.springframework.security.core.userdetails.User.builder()
                .username(user.getEmail())
                .password(user.getPassword())
                .authorities(Collections.singletonList(() -> user.getRole().name()))
                .build();
    }

    public static JwtTokenProvider createJwtTokenProvider(Clock clock) {
        return new JwtTokenProvider(TEST_SECRET, ACCESS_EXPIRATION, REFRESH_EXPIRATION, clock);
    }

    public static String generateAccessToken(JwtTokenProvider jwtTokenProvider, User user) {
        return jwtTokenProvider.generateAccessToken(createUserDetails(user));
    }
}
