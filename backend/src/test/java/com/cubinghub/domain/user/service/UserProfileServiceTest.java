package com.cubinghub.domain.user.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.mockito.Mockito.when;

import com.cubinghub.common.exception.CustomApiException;
import com.cubinghub.domain.record.entity.EventType;
import com.cubinghub.domain.record.entity.Penalty;
import com.cubinghub.domain.record.repository.RecordRepository;
import com.cubinghub.domain.user.dto.response.MyRecordPageResponse;
import com.cubinghub.domain.user.dto.response.MyProfileResponse;
import com.cubinghub.domain.user.entity.User;
import com.cubinghub.domain.user.entity.UserRole;
import com.cubinghub.domain.user.entity.UserStatus;
import com.cubinghub.domain.user.repository.UserRepository;
import com.cubinghub.support.TestFixtures;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

@ExtendWith(MockitoExtension.class)
@DisplayName("UserProfileService 단위 테스트")
class UserProfileServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RecordRepository recordRepository;

    private UserProfileService userProfileService;

    @BeforeEach
    void setUp() {
        userProfileService = new UserProfileService(userRepository, recordRepository);
    }

    @Test
    @DisplayName("마이페이지 프로필 조회는 유효 시간 기준 요약을 반환한다")
    void should_return_profile_summary_when_user_exists() {
        User user = TestFixtures.createUser(1L, "tester@cubinghub.com", "Tester", UserRole.ROLE_USER, UserStatus.ACTIVE);
        var bestRecord = TestFixtures.createRecord(10L, user, EventType.WCA_333, 10000, Penalty.NONE, "best");
        var plusTwoRecord = TestFixtures.createRecord(11L, user, EventType.WCA_333, 9000, Penalty.PLUS_TWO, "plus-two");
        var dnfRecord = TestFixtures.createRecord(12L, user, EventType.WCA_333, 9500, Penalty.DNF, "dnf");

        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        when(recordRepository.findByUserIdOrderByCreatedAtDesc(user.getId()))
                .thenReturn(List.of(dnfRecord, plusTwoRecord, bestRecord));

        MyProfileResponse response = userProfileService.getMyProfile(user.getEmail());

        assertThat(response.getUserId()).isEqualTo(user.getId());
        assertThat(response.getNickname()).isEqualTo(user.getNickname());
        assertThat(response.getMainEvent()).isEqualTo(user.getMainEvent());
        assertThat(response.getSummary().getTotalSolveCount()).isEqualTo(3);
        assertThat(response.getSummary().getPersonalBestTimeMs()).isEqualTo(10000);
        assertThat(response.getSummary().getAverageTimeMs()).isEqualTo(10500);
    }

    @Test
    @DisplayName("내 기록 조회는 페이지 메타데이터와 기록 목록을 반환한다")
    void should_return_paginated_records_when_user_exists() {
        User user = TestFixtures.createUser(1L, "tester@cubinghub.com", "Tester", UserRole.ROLE_USER, UserStatus.ACTIVE);
        var plusTwoRecord = TestFixtures.createRecord(11L, user, EventType.WCA_333, 9000, Penalty.PLUS_TWO, "plus-two");
        var dnfRecord = TestFixtures.createRecord(12L, user, EventType.WCA_333, 9500, Penalty.DNF, "dnf");

        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        when(recordRepository.findByUserIdOrderByCreatedAtDesc(user.getId(), PageRequest.of(1, 2)))
                .thenReturn(new PageImpl<>(List.of(dnfRecord, plusTwoRecord), PageRequest.of(1, 2), 5));

        MyRecordPageResponse response = userProfileService.getMyRecords(user.getEmail(), 2, 2);

        assertThat(response.getItems()).hasSize(2);
        assertThat(response.getItems().get(0).getPenalty()).isEqualTo(Penalty.DNF);
        assertThat(response.getItems().get(0).getEffectiveTimeMs()).isNull();
        assertThat(response.getItems().get(1).getEffectiveTimeMs()).isEqualTo(11000);
        assertThat(response.getPage()).isEqualTo(2);
        assertThat(response.getSize()).isEqualTo(2);
        assertThat(response.getTotalElements()).isEqualTo(5);
        assertThat(response.getTotalPages()).isEqualTo(3);
        assertThat(response.isHasNext()).isTrue();
        assertThat(response.isHasPrevious()).isTrue();
    }

    @Test
    @DisplayName("마이페이지 프로필 조회는 유효 시간이 없으면 PB와 평균을 null로 반환한다")
    void should_return_null_summary_values_when_profile_records_have_no_effective_times() {
        User user = TestFixtures.createUser(1L, "dnf@cubinghub.com", "DNFUser", UserRole.ROLE_USER, UserStatus.ACTIVE);
        var dnfRecord = TestFixtures.createRecord(12L, user, EventType.WCA_333, 9500, Penalty.DNF, "dnf");

        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        when(recordRepository.findByUserIdOrderByCreatedAtDesc(user.getId())).thenReturn(List.of(dnfRecord));

        MyProfileResponse response = userProfileService.getMyProfile(user.getEmail());

        assertThat(response.getSummary().getTotalSolveCount()).isEqualTo(1);
        assertThat(response.getSummary().getPersonalBestTimeMs()).isNull();
        assertThat(response.getSummary().getAverageTimeMs()).isNull();
    }

    @Test
    @DisplayName("존재하지 않는 사용자의 마이페이지 조회는 401 예외를 던진다")
    void should_throw_unauthorized_exception_when_user_does_not_exist() {
        when(userRepository.findByEmail("missing@cubinghub.com")).thenReturn(Optional.empty());

        Throwable thrown = catchThrowable(() -> userProfileService.getMyProfile("missing@cubinghub.com"));

        assertThat(thrown)
                .isInstanceOf(CustomApiException.class)
                .hasMessage("사용자를 찾을 수 없습니다.");
    }

    @Test
    @DisplayName("존재하지 않는 사용자의 내 기록 조회는 401 예외를 던진다")
    void should_throw_unauthorized_exception_when_my_records_user_does_not_exist() {
        when(userRepository.findByEmail("missing@cubinghub.com")).thenReturn(Optional.empty());

        Throwable thrown = catchThrowable(() -> userProfileService.getMyRecords("missing@cubinghub.com", 1, 10));

        assertThat(thrown)
                .isInstanceOf(CustomApiException.class)
                .hasMessage("사용자를 찾을 수 없습니다.");
    }

    @Test
    @DisplayName("내 기록 조회 page가 1보다 작으면 예외를 던진다")
    void should_throw_illegal_argument_exception_when_page_is_less_than_one() {
        Throwable thrown = catchThrowable(() -> userProfileService.getMyRecords("tester@cubinghub.com", 0, 10));

        assertThat(thrown)
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("page는 1 이상이어야 합니다.");
    }

    @Test
    @DisplayName("내 기록 조회 size가 1보다 작으면 예외를 던진다")
    void should_throw_illegal_argument_exception_when_size_is_less_than_one() {
        Throwable thrown = catchThrowable(() -> userProfileService.getMyRecords("tester@cubinghub.com", 1, 0));

        assertThat(thrown)
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("size는 1 이상 100 이하여야 합니다.");
    }

    @Test
    @DisplayName("내 기록 조회 size가 범위를 벗어나면 예외를 던진다")
    void should_throw_illegal_argument_exception_when_size_is_out_of_range() {
        Throwable thrown = catchThrowable(() -> userProfileService.getMyRecords("tester@cubinghub.com", 1, 101));

        assertThat(thrown)
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("size는 1 이상 100 이하여야 합니다.");
    }
}
