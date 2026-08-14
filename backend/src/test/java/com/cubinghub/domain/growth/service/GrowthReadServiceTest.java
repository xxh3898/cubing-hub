package com.cubinghub.domain.growth.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.cubinghub.common.exception.CustomApiException;
import com.cubinghub.domain.growth.dto.response.GrowthSummaryResponse;
import com.cubinghub.domain.growth.metric.GrowthRecord;
import com.cubinghub.domain.growth.repository.GrowthReadRepository;
import com.cubinghub.domain.growth.repository.GrowthReadRepository.ActivitySummary;
import com.cubinghub.domain.growth.repository.GrowthReadRepository.CurrentPb;
import com.cubinghub.domain.record.entity.EventType;
import com.cubinghub.domain.record.entity.Penalty;
import com.cubinghub.domain.record.policy.PracticeEventCapabilities;
import com.cubinghub.domain.user.entity.User;
import com.cubinghub.domain.user.entity.UserRole;
import com.cubinghub.domain.user.entity.UserStatus;
import com.cubinghub.domain.user.repository.UserRepository;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

@ExtendWith(MockitoExtension.class)
@DisplayName("GrowthReadService 단위 테스트")
class GrowthReadServiceTest {

    private static final Instant GENERATED_AT = Instant.parse("2026-08-11T15:01:00Z");

    @Mock
    private UserRepository userRepository;

    @Mock
    private GrowthReadRepository growthReadRepository;

    @Mock
    private PracticeEventCapabilities eventCapabilities;

    @Mock
    private Clock clock;

    private GrowthReadService growthReadService;

    @BeforeEach
    void setUp() {
        growthReadService = new GrowthReadService(
                userRepository,
                growthReadRepository,
                eventCapabilities,
                clock
        );
    }

    @Test
    @DisplayName("summary는 한 Clock snapshot으로 모든 metric 기준 시각을 고정한다")
    void should_use_one_clock_snapshot_when_building_growth_summary() {
        User user = User.builder()
                .email("growth@test.com")
                .password("password")
                .nickname("Growth")
                .role(UserRole.ROLE_USER)
                .status(UserStatus.ACTIVE)
                .mainEvent("WCA_333")
                .build();
        org.springframework.test.util.ReflectionTestUtils.setField(user, "id", 1L);

        List<GrowthRecord> records = List.of(
                new GrowthRecord(1L, 20000, Penalty.NONE, Instant.parse("2026-08-10T00:00:00Z"))
        );
        when(userRepository.findByEmail("growth@test.com")).thenReturn(Optional.of(user));
        when(clock.instant()).thenReturn(GENERATED_AT);
        when(growthReadRepository.findRecentRecords(1L, EventType.WCA_333, 24)).thenReturn(records);
        when(growthReadRepository.findRecordsInRange(any(), any(), any(), any())).thenReturn(records);
        when(growthReadRepository.findActivitySummary(any(), any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(new ActivitySummary(1L, 1L, 0L, 1L, 1, records.get(0).createdAt(), records.get(0).createdAt()));
        when(growthReadRepository.findCurrentPb(1L, EventType.WCA_333))
                .thenReturn(Optional.of(new CurrentPb(
                        1L,
                        20000,
                        Penalty.NONE,
                        20000,
                        records.get(0).createdAt()
                )));

        GrowthSummaryResponse response = growthReadService.getSummary("growth@test.com", EventType.WCA_333);

        assertThat(response.generatedAt()).isEqualTo(GENERATED_AT);
        assertThat(response.asOfDate()).hasToString("2026-08-12");
        assertThat(response.currentPb().recordId()).isEqualTo(1L);
        verify(clock, times(1)).instant();
        verify(growthReadRepository).findActivitySummary(
                1L,
                EventType.WCA_333,
                Instant.parse("2026-08-05T15:00:00Z"),
                Instant.parse("2026-08-12T15:00:00Z"),
                Instant.parse("2026-07-29T15:00:00Z"),
                Instant.parse("2026-08-05T15:00:00Z"),
                Instant.parse("2026-07-13T15:00:00Z"),
                Instant.parse("2026-08-12T15:00:00Z")
        );
    }

    @Test
    @DisplayName("지원하지 않는 event는 user 또는 Growth repository 조회 전에 거절한다")
    void should_reject_unsupported_event_before_reading_user_or_growth_data() {
        doThrow(new CustomApiException(
                PracticeEventCapabilities.UNSUPPORTED_EVENT_MESSAGE,
                HttpStatus.BAD_REQUEST
        )).when(eventCapabilities).requirePracticeRecordSupported(EventType.WCA_222);

        assertThatThrownBy(() -> growthReadService.getSummary("growth@test.com", EventType.WCA_222))
                .isInstanceOf(CustomApiException.class)
                .hasMessage(PracticeEventCapabilities.UNSUPPORTED_EVENT_MESSAGE);

        verifyNoInteractions(userRepository, growthReadRepository, clock);
    }
}
