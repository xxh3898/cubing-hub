package com.cubinghub.domain.home.service;

import static org.assertj.core.api.Assertions.catchThrowable;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.cubinghub.common.exception.CustomApiException;
import com.cubinghub.domain.home.dto.response.HomeResponse;
import com.cubinghub.domain.post.dto.response.PostListItemResponse;
import com.cubinghub.domain.post.repository.PostRepository;
import com.cubinghub.domain.record.dto.response.ScrambleResponse;
import com.cubinghub.domain.record.entity.EventType;
import com.cubinghub.domain.record.entity.Penalty;
import com.cubinghub.domain.record.repository.RecordRepository;
import com.cubinghub.domain.record.service.ScrambleService;
import com.cubinghub.domain.user.dto.response.MyProfileResponse;
import com.cubinghub.domain.user.dto.response.MyProfileSummaryResponse;
import com.cubinghub.domain.user.service.UserProfileService;
import com.cubinghub.support.TestFixtures;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
@DisplayName("HomeService 단위 테스트")
class HomeServiceTest {

    @Mock
    private ScrambleService scrambleService;

    @Mock
    private UserProfileService userProfileService;

    @Mock
    private RecordRepository recordRepository;

    @Mock
    private PostRepository postRepository;

    private HomeService homeService;

    @BeforeEach
    void setUp() {
        homeService = new HomeService(scrambleService, userProfileService, recordRepository, postRepository);
    }

    @Test
    @DisplayName("게스트 홈 조회는 스크램블과 최신 게시글만 반환한다")
    void should_return_guest_home_when_email_is_missing() {
        List<PostListItemResponse> recentPosts = List.of(
                new PostListItemResponse(1L, com.cubinghub.domain.post.entity.PostCategory.FREE, "첫 글", "Writer", 3, LocalDateTime.now())
        );

        when(scrambleService.generateDaily(eq(EventType.WCA_333), any(LocalDate.class))).thenReturn(new ScrambleResponse("WCA_333", "R U R'"));
        when(postRepository.findRecent(3)).thenReturn(recentPosts);

        HomeResponse response = homeService.getHome(null);

        assertThat(response.getTodayScramble().eventType()).isEqualTo("WCA_333");
        assertThat(response.getSummary()).isNull();
        assertThat(response.getRecentRecords()).isEmpty();
        assertThat(response.getRecentPosts()).hasSize(1);
        verifyNoInteractions(userProfileService, recordRepository);
    }

    @Test
    @DisplayName("로그인 홈 조회는 요약과 최근 기록을 함께 반환한다")
    void should_return_authenticated_home_when_email_exists() {
        var user = TestFixtures.createUser(1L, "home@cubinghub.com", "HomeUser", com.cubinghub.domain.user.entity.UserRole.ROLE_USER,
                com.cubinghub.domain.user.entity.UserStatus.ACTIVE);
        var firstRecord = TestFixtures.createRecord(10L, user, EventType.WCA_333, 9344, Penalty.NONE, "first scramble");
        var secondRecord = TestFixtures.createRecord(11L, user, EventType.WCA_333, 10021, Penalty.PLUS_TWO, "second scramble");
        ReflectionTestUtils.setField(firstRecord, "createdAt", LocalDateTime.of(2026, 4, 15, 10, 0));
        ReflectionTestUtils.setField(secondRecord, "createdAt", LocalDateTime.of(2026, 4, 15, 9, 30));

        when(scrambleService.generateDaily(eq(EventType.WCA_333), any(LocalDate.class))).thenReturn(new ScrambleResponse("WCA_333", "R U R'"));
        when(postRepository.findRecent(3)).thenReturn(List.of(
                new PostListItemResponse(3L, com.cubinghub.domain.post.entity.PostCategory.FREE, "최신 글", "Writer", 7,
                        LocalDateTime.of(2026, 4, 15, 11, 0))
        ));
        when(userProfileService.getMyProfile(user.getEmail())).thenReturn(new MyProfileResponse(
                user.getId(),
                user.getNickname(),
                user.getMainEvent(),
                new MyProfileSummaryResponse(2, 9344, 10183)
        ));
        when(recordRepository.findByUserIdOrderByCreatedAtDesc(user.getId(), PageRequest.of(0, 5)))
                .thenReturn(new PageImpl<>(List.of(firstRecord, secondRecord), PageRequest.of(0, 5), 2));

        HomeResponse response = homeService.getHome(user.getEmail());

        assertThat(response.getSummary()).isNotNull();
        assertThat(response.getSummary().getNickname()).isEqualTo("HomeUser");
        assertThat(response.getSummary().getTotalSolveCount()).isEqualTo(2);
        assertThat(response.getRecentRecords()).hasSize(2);
        assertThat(response.getRecentRecords().get(0).getScramble()).isEqualTo("first scramble");
        assertThat(response.getRecentPosts()).hasSize(1);
        verify(recordRepository).findByUserIdOrderByCreatedAtDesc(user.getId(), PageRequest.of(0, 5));
    }

    @Test
    @DisplayName("인증 이메일이 있지만 사용자 조회가 401이면 게스트 홈으로 fallback 한다")
    void should_fallback_to_guest_home_when_authenticated_user_is_missing() {
        List<PostListItemResponse> recentPosts = List.of(
                new PostListItemResponse(1L, com.cubinghub.domain.post.entity.PostCategory.FREE, "첫 글", "Writer", 3, LocalDateTime.now())
        );

        when(scrambleService.generateDaily(eq(EventType.WCA_333), any(LocalDate.class))).thenReturn(new ScrambleResponse("WCA_333", "R U R'"));
        when(postRepository.findRecent(3)).thenReturn(recentPosts);
        when(userProfileService.getMyProfile("missing@cubinghub.com"))
                .thenThrow(new CustomApiException("사용자를 찾을 수 없습니다.", HttpStatus.UNAUTHORIZED));

        HomeResponse response = homeService.getHome("missing@cubinghub.com");

        assertThat(response.getSummary()).isNull();
        assertThat(response.getRecentRecords()).isEmpty();
        assertThat(response.getRecentPosts()).hasSize(1);
        verifyNoInteractions(recordRepository);
    }

    @Test
    @DisplayName("인증 이메일이 있지만 비인가 외 예외면 그대로 전파한다")
    void should_rethrow_exception_when_authenticated_home_fails_with_non_unauthorized_error() {
        when(scrambleService.generateDaily(eq(EventType.WCA_333), any(LocalDate.class))).thenReturn(new ScrambleResponse("WCA_333", "R U R'"));
        when(postRepository.findRecent(3)).thenReturn(List.of());
        when(userProfileService.getMyProfile("home@cubinghub.com"))
                .thenThrow(new CustomApiException("프로필 조회 실패", HttpStatus.INTERNAL_SERVER_ERROR));

        Throwable thrown = catchThrowable(() -> homeService.getHome("home@cubinghub.com"));

        assertThat(thrown).isInstanceOf(CustomApiException.class);
        CustomApiException exception = (CustomApiException) thrown;
        assertThat(exception.getStatus()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(exception.getMessage()).isEqualTo("프로필 조회 실패");
    }

    @Test
    @DisplayName("홈 조회는 서울 날짜 기준 daily scramble을 사용한다")
    void should_request_daily_scramble_when_home_is_requested() {
        when(scrambleService.generateDaily(eq(EventType.WCA_333), any(LocalDate.class))).thenReturn(new ScrambleResponse("WCA_333", "R U R'"));
        when(postRepository.findRecent(3)).thenReturn(List.of());

        homeService.getHome(null);

        verify(scrambleService).generateDaily(eq(EventType.WCA_333), any(LocalDate.class));
    }
}
