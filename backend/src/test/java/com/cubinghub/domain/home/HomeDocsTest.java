package com.cubinghub.domain.home;

import static org.springframework.restdocs.headers.HeaderDocumentation.headerWithName;
import static org.springframework.restdocs.headers.HeaderDocumentation.requestHeaders;
import static org.springframework.restdocs.mockmvc.MockMvcRestDocumentation.document;
import static org.springframework.restdocs.mockmvc.RestDocumentationRequestBuilders.get;
import static org.springframework.restdocs.payload.PayloadDocumentation.fieldWithPath;
import static org.springframework.restdocs.payload.PayloadDocumentation.responseFields;
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
import com.cubinghub.integration.RestDocsIntegrationTest;
import com.cubinghub.security.JwtTokenProvider;
import com.cubinghub.support.TestFixtures;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.restdocs.payload.JsonFieldType;

class HomeDocsTest extends RestDocsIntegrationTest {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RecordRepository recordRepository;

    @Autowired
    private PostRepository postRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Test
    @DisplayName("홈 대시보드는 게스트와 로그인 사용자 모두 조회할 수 있다")
    void should_return_home_dashboard_when_home_is_requested() throws Exception {
        User savedUser = userRepository.save(User.builder()
                .email("home-docs@cubinghub.com")
                .password("password")
                .nickname("HomeDocsUser")
                .role(UserRole.ROLE_USER)
                .status(UserStatus.ACTIVE)
                .mainEvent("3x3x3")
                .build());
        saveRecord(savedUser, 9344, Penalty.NONE, "first scramble");
        saveRecord(savedUser, 10128, Penalty.PLUS_TWO, "second scramble");
        savePost(savedUser, "홈 문서 게시글");

        String accessToken = TestFixtures.generateAccessToken(jwtTokenProvider, savedUser);

        mockMvc.perform(get("/api/home")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.message").value("홈 대시보드를 조회했습니다."))
                .andExpect(jsonPath("$.data.summary.nickname").value("HomeDocsUser"))
                .andDo(document("home/get",
                        requestHeaders(
                                headerWithName("Authorization").optional().description("Access Token을 담은 Bearer 인증 헤더. guest 요청은 생략한다.")
                        ),
                        responseFields(
                                fieldWithPath("status").type(JsonFieldType.NUMBER).description("HTTP 상태 코드"),
                                fieldWithPath("message").type(JsonFieldType.STRING).description("응답 메시지"),
                                fieldWithPath("data").type(JsonFieldType.OBJECT).description("홈 대시보드 응답"),
                                fieldWithPath("data.todayScramble").type(JsonFieldType.OBJECT).description("오늘의 스크램블"),
                                fieldWithPath("data.todayScramble.eventType").type(JsonFieldType.STRING).description("스크램블 종목 코드"),
                                fieldWithPath("data.todayScramble.scramble").type(JsonFieldType.STRING).description("생성된 스크램블 문자열"),
                                fieldWithPath("data.summary").type(JsonFieldType.VARIES).description("로그인 사용자는 요약 객체, guest는 null"),
                                fieldWithPath("data.summary.nickname").type(JsonFieldType.STRING).description("현재 로그인 사용자 닉네임"),
                                fieldWithPath("data.summary.mainEvent").type(JsonFieldType.STRING).description("현재 로그인 사용자 주 종목"),
                                fieldWithPath("data.summary.totalSolveCount").type(JsonFieldType.NUMBER).description("전체 기록 수"),
                                fieldWithPath("data.summary.personalBestTimeMs").type(JsonFieldType.NUMBER).description("유효 시간 기준 최고 기록 (밀리초)"),
                                fieldWithPath("data.summary.averageTimeMs").type(JsonFieldType.NUMBER).description("DNF 제외 평균 기록 (밀리초)"),
                                fieldWithPath("data.recentRecords").type(JsonFieldType.ARRAY).description("최근 기록 최대 5건. guest는 빈 배열"),
                                fieldWithPath("data.recentRecords[].id").type(JsonFieldType.NUMBER).description("기록 ID"),
                                fieldWithPath("data.recentRecords[].eventType").type(JsonFieldType.STRING).description("WCA 종목 코드"),
                                fieldWithPath("data.recentRecords[].timeMs").type(JsonFieldType.NUMBER).description("원본 측정 시간 (밀리초)"),
                                fieldWithPath("data.recentRecords[].effectiveTimeMs").type(JsonFieldType.NUMBER).optional().description("페널티 반영 시간 (DNF면 null)"),
                                fieldWithPath("data.recentRecords[].penalty").type(JsonFieldType.STRING).description("페널티 정보"),
                                fieldWithPath("data.recentRecords[].scramble").type(JsonFieldType.STRING).description("해당 기록의 스크램블"),
                                fieldWithPath("data.recentRecords[].createdAt").type(JsonFieldType.STRING).description("기록 생성 시각"),
                                fieldWithPath("data.recentPosts").type(JsonFieldType.ARRAY).description("최신 커뮤니티 게시글 최대 3건"),
                                fieldWithPath("data.recentPosts[].id").type(JsonFieldType.NUMBER).description("게시글 ID"),
                                fieldWithPath("data.recentPosts[].category").type(JsonFieldType.STRING).description("게시글 카테고리"),
                                fieldWithPath("data.recentPosts[].title").type(JsonFieldType.STRING).description("게시글 제목"),
                                fieldWithPath("data.recentPosts[].authorNickname").type(JsonFieldType.STRING).description("작성자 닉네임"),
                                fieldWithPath("data.recentPosts[].viewCount").type(JsonFieldType.NUMBER).description("조회수"),
                                fieldWithPath("data.recentPosts[].createdAt").type(JsonFieldType.STRING).description("게시글 생성 시각")
                        )
                ));
    }

    private void saveRecord(User user, int timeMs, Penalty penalty, String scramble) {
        recordRepository.save(Record.builder()
                .user(user)
                .eventType(EventType.WCA_333)
                .timeMs(timeMs)
                .penalty(penalty)
                .scramble(scramble)
                .build());
    }

    private void savePost(User user, String title) {
        postRepository.save(Post.builder()
                .user(user)
                .category(PostCategory.FREE)
                .title(title)
                .content(title + " 본문")
                .build());
    }
}
