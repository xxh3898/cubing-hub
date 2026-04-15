package com.cubinghub.domain.home;

import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.cubinghub.domain.post.entity.Post;
import com.cubinghub.domain.post.entity.PostCategory;
import com.cubinghub.domain.post.repository.PostRepository;
import com.cubinghub.domain.record.entity.EventType;
import com.cubinghub.domain.record.entity.Penalty;
import com.cubinghub.domain.record.entity.Record;
import com.cubinghub.domain.record.repository.RecordRepository;
import com.cubinghub.domain.user.entity.User;
import com.cubinghub.domain.user.entity.UserRole;
import com.cubinghub.domain.user.entity.UserStatus;
import com.cubinghub.domain.user.repository.UserRepository;
import com.cubinghub.integration.JpaIntegrationTest;
import com.cubinghub.security.JwtTokenProvider;
import com.cubinghub.support.TestFixtures;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc
@DisplayName("HomeController 통합 테스트")
class HomeControllerIntegrationTest extends JpaIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RecordRepository recordRepository;

    @Autowired
    private PostRepository postRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Test
    @DisplayName("비로그인 홈 조회는 스크램블과 최신 게시글을 반환하고 개인 요약은 비운다")
    void should_return_guest_home_when_authentication_is_missing() throws Exception {
        User author = saveUser("guest-posts@cubinghub.com", "GuestAuthor", UserRole.ROLE_USER);
        savePost(author, "첫 글");
        savePost(author, "둘째 글");
        savePost(author, "셋째 글");

        mockMvc.perform(get("/api/home"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.message").value("홈 대시보드를 조회했습니다."))
                .andExpect(jsonPath("$.data.todayScramble.eventType").value("WCA_333"))
                .andExpect(jsonPath("$.data.todayScramble.scramble").isNotEmpty())
                .andExpect(jsonPath("$.data.summary").value(nullValue()))
                .andExpect(jsonPath("$.data.recentRecords.length()").value(0))
                .andExpect(jsonPath("$.data.recentPosts.length()").value(3));
    }

    @Test
    @DisplayName("로그인 홈 조회는 요약, 최근 기록, 최신 게시글을 함께 반환한다")
    void should_return_authenticated_home_when_access_token_is_valid() throws Exception {
        User savedUser = saveUser("home@cubinghub.com", "HomeUser", UserRole.ROLE_USER);
        saveRecord(savedUser, 9344, Penalty.NONE, "first scramble");
        saveRecord(savedUser, 10021, Penalty.PLUS_TWO, "second scramble");
        savePost(savedUser, "홈 최신 글");

        String accessToken = TestFixtures.generateAccessToken(jwtTokenProvider, savedUser);

        mockMvc.perform(get("/api/home")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.summary.nickname").value("HomeUser"))
                .andExpect(jsonPath("$.data.summary.mainEvent").value("3x3x3"))
                .andExpect(jsonPath("$.data.summary.totalSolveCount").value(2))
                .andExpect(jsonPath("$.data.recentRecords.length()").value(2))
                .andExpect(jsonPath("$.data.recentRecords[0].scramble").isNotEmpty())
                .andExpect(jsonPath("$.data.recentPosts.length()").value(1));
    }

    private User saveUser(String email, String nickname, UserRole role) {
        return userRepository.save(User.builder()
                .email(email)
                .password("password")
                .nickname(nickname)
                .role(role)
                .status(UserStatus.ACTIVE)
                .mainEvent("3x3x3")
                .build());
    }

    private Record saveRecord(User user, int timeMs, Penalty penalty, String scramble) {
        return recordRepository.save(Record.builder()
                .user(user)
                .eventType(EventType.WCA_333)
                .timeMs(timeMs)
                .penalty(penalty)
                .scramble(scramble)
                .build());
    }

    private Post savePost(User user, String title) {
        return postRepository.save(Post.builder()
                .user(user)
                .category(PostCategory.FREE)
                .title(title)
                .content(title + " 본문")
                .build());
    }
}
