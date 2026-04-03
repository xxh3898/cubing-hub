package com.cubinghub.domain;

import com.cubinghub.domain.post.entity.Comment;
import com.cubinghub.domain.post.entity.Post;
import com.cubinghub.domain.post.entity.PostCategory;
import com.cubinghub.domain.record.entity.EventType;
import com.cubinghub.domain.record.entity.Penalty;
import com.cubinghub.domain.record.entity.Record;
import com.cubinghub.domain.record.entity.UserPB;
import com.cubinghub.domain.user.entity.User;
import com.cubinghub.domain.user.entity.UserRole;
import com.cubinghub.domain.user.entity.UserStatus;
import com.cubinghub.integration.BaseIntegrationTest;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import static org.assertj.core.api.Assertions.assertThat;

public class EntityMappingTest extends BaseIntegrationTest {

    @Autowired
    private EntityManager em;

    @Test
    @DisplayName("모든 도메인 엔티티 매핑 및 오디팅 기능을 검증한다")
    void entityMappingTest() {
        // 1. User 저장
        User user = User.builder()
                .email("test@test.com")
                .password("password")
                .nickname("tester")
                .role(UserRole.ROLE_USER)
                .status(UserStatus.ACTIVE)
                .mainEvent("3x3x3")
                .build();
        em.persist(user);

        // 2. Record 저장
        Record record = Record.builder()
                .user(user)
                .eventType(EventType.WCA_333)
                .timeMs(10500)
                .penalty(Penalty.NONE)
                .scramble("U R U' R'")
                .build();
        em.persist(record);

        // 3. UserPB 저장 (Record와 1:1)
        UserPB userPB = UserPB.builder()
                .user(user)
                .eventType(EventType.WCA_333)
                .bestTimeMs(10500)
                .record(record)
                .build();
        em.persist(userPB);

        // 4. Post 저장
        Post post = Post.builder()
                .user(user)
                .category(PostCategory.FREE)
                .title("테스트 제목")
                .content("테스트 내용")
                .build();
        em.persist(post);

        // 5. Comment 저장
        Comment comment = Comment.builder()
                .post(post)
                .user(user)
                .content("테스트 댓글")
                .build();
        em.persist(comment);

        em.flush();
        em.clear();

        // 검증
        User foundUser = em.find(User.class, user.getId());
        assertThat(foundUser.getEmail()).isEqualTo("test@test.com");
        assertThat(foundUser.getCreatedAt()).isNotNull();
        assertThat(foundUser.getUpdatedAt()).isNotNull();

        Record foundRecord = em.find(Record.class, record.getId());
        assertThat(foundRecord.getUser().getId()).isEqualTo(user.getId());
        assertThat(foundRecord.getTimeMs()).isEqualTo(10500);

        UserPB foundPB = em.find(UserPB.class, userPB.getId());
        assertThat(foundPB.getBestTimeMs()).isEqualTo(foundRecord.getTimeMs());
        assertThat(foundPB.getRecord().getId()).isEqualTo(record.getId());

        Post foundPost = em.find(Post.class, post.getId());
        assertThat(foundPost.getTitle()).isEqualTo("테스트 제목");
        assertThat(foundPost.getViewCount()).isEqualTo(0);

        Comment foundComment = em.find(Comment.class, comment.getId());
        assertThat(foundComment.getContent()).isEqualTo("테스트 댓글");
    }
}
