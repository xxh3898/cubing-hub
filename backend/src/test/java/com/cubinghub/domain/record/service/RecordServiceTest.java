package com.cubinghub.domain.record.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.cubinghub.domain.record.dto.request.RecordSaveRequest;
import com.cubinghub.domain.record.dto.response.RankingResponse;
import com.cubinghub.domain.record.entity.EventType;
import com.cubinghub.domain.record.entity.Penalty;
import com.cubinghub.domain.record.entity.Record;
import com.cubinghub.domain.record.entity.UserPB;
import com.cubinghub.domain.record.repository.RankingQueryResult;
import com.cubinghub.domain.record.repository.RecordRepository;
import com.cubinghub.domain.record.repository.UserPBRepository;
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
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
@DisplayName("RecordService 단위 테스트")
class RecordServiceTest {

    @Mock
    private RecordRepository recordRepository;

    @Mock
    private UserPBRepository userPBRepository;

    @Mock
    private UserRepository userRepository;

    private RecordService recordService;

    @BeforeEach
    void setUp() {
        recordService = new RecordService(recordRepository, userPBRepository, userRepository);
    }

    @Test
    @DisplayName("DNF 기록은 PB를 생성하거나 갱신하지 않는다")
    void should_not_create_or_update_pb_when_record_penalty_is_dnf() {
        User user = TestFixtures.createUser(1L, "tester@cubinghub.com", "Tester", UserRole.ROLE_USER, UserStatus.ACTIVE);
        Record savedRecord = TestFixtures.createRecord(10L, user, EventType.WCA_333, 12000, Penalty.DNF, "scramble");
        RecordSaveRequest request = RecordSaveRequest.builder()
                .eventType(EventType.WCA_333)
                .timeMs(12000)
                .penalty(Penalty.DNF)
                .scramble("scramble")
                .build();

        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        when(recordRepository.save(any(Record.class))).thenReturn(savedRecord);

        Long recordId = recordService.saveRecord(user.getEmail(), request);

        assertThat(recordId).isEqualTo(savedRecord.getId());
        verify(userPBRepository, never()).findByUserAndEventType(any(), any());
        verify(userPBRepository, never()).save(any(UserPB.class));
    }

    @Test
    @DisplayName("PB가 없으면 새 PB를 생성한다")
    void should_create_pb_when_no_existing_pb_exists() {
        User user = TestFixtures.createUser(1L, "tester@cubinghub.com", "Tester", UserRole.ROLE_USER, UserStatus.ACTIVE);
        Record savedRecord = TestFixtures.createRecord(10L, user, EventType.WCA_333, 9800, Penalty.NONE, "scramble");
        RecordSaveRequest request = RecordSaveRequest.builder()
                .eventType(EventType.WCA_333)
                .timeMs(9800)
                .penalty(Penalty.NONE)
                .scramble("scramble")
                .build();

        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        when(recordRepository.save(any(Record.class))).thenReturn(savedRecord);
        when(userPBRepository.findByUserAndEventType(user, EventType.WCA_333)).thenReturn(Optional.empty());

        Long recordId = recordService.saveRecord(user.getEmail(), request);

        ArgumentCaptor<UserPB> pbCaptor = ArgumentCaptor.forClass(UserPB.class);
        assertThat(recordId).isEqualTo(savedRecord.getId());
        verify(userPBRepository).save(pbCaptor.capture());
        assertThat(pbCaptor.getValue().getUser()).isEqualTo(user);
        assertThat(pbCaptor.getValue().getEventType()).isEqualTo(EventType.WCA_333);
        assertThat(pbCaptor.getValue().getBestTimeMs()).isEqualTo(9800);
        assertThat(pbCaptor.getValue().getRecord()).isEqualTo(savedRecord);
    }

    @Test
    @DisplayName("기존 PB보다 빠른 기록은 PB를 갱신한다")
    void should_update_existing_pb_when_saved_record_is_faster() {
        User user = TestFixtures.createUser(1L, "tester@cubinghub.com", "Tester", UserRole.ROLE_USER, UserStatus.ACTIVE);
        Record currentBestRecord = TestFixtures.createRecord(1L, user, EventType.WCA_333, 10000, Penalty.NONE, "best");
        Record fasterRecord = TestFixtures.createRecord(2L, user, EventType.WCA_333, 9500, Penalty.NONE, "fast");
        UserPB existingPb = spy(UserPB.builder()
                .id(11L)
                .user(user)
                .eventType(EventType.WCA_333)
                .bestTimeMs(10000)
                .record(currentBestRecord)
                .build());
        RecordSaveRequest request = RecordSaveRequest.builder()
                .eventType(EventType.WCA_333)
                .timeMs(9500)
                .penalty(Penalty.NONE)
                .scramble("fast")
                .build();

        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        when(recordRepository.save(any(Record.class))).thenReturn(fasterRecord);
        when(userPBRepository.findByUserAndEventType(user, EventType.WCA_333)).thenReturn(Optional.of(existingPb));

        Long recordId = recordService.saveRecord(user.getEmail(), request);

        assertThat(recordId).isEqualTo(fasterRecord.getId());
        verify(existingPb).updateBestTime(9500, fasterRecord);
        verify(userPBRepository, never()).save(any(UserPB.class));
    }

    @Test
    @DisplayName("기존 PB보다 느린 기록은 PB를 유지한다")
    void should_keep_existing_pb_when_saved_record_is_slower() {
        User user = TestFixtures.createUser(1L, "tester@cubinghub.com", "Tester", UserRole.ROLE_USER, UserStatus.ACTIVE);
        Record currentBestRecord = TestFixtures.createRecord(1L, user, EventType.WCA_333, 10000, Penalty.NONE, "best");
        Record slowerRecord = TestFixtures.createRecord(2L, user, EventType.WCA_333, 15000, Penalty.NONE, "slow");
        UserPB existingPb = spy(UserPB.builder()
                .id(11L)
                .user(user)
                .eventType(EventType.WCA_333)
                .bestTimeMs(10000)
                .record(currentBestRecord)
                .build());
        RecordSaveRequest request = RecordSaveRequest.builder()
                .eventType(EventType.WCA_333)
                .timeMs(15000)
                .penalty(Penalty.NONE)
                .scramble("slow")
                .build();

        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        when(recordRepository.save(any(Record.class))).thenReturn(slowerRecord);
        when(userPBRepository.findByUserAndEventType(user, EventType.WCA_333)).thenReturn(Optional.of(existingPb));

        Long recordId = recordService.saveRecord(user.getEmail(), request);

        assertThat(recordId).isEqualTo(slowerRecord.getId());
        verify(existingPb, never()).updateBestTime(any(), any());
        verify(userPBRepository, never()).save(any(UserPB.class));
    }

    @Test
    @DisplayName("기존 PB와 같은 기록은 PB를 유지한다")
    void should_keep_existing_pb_when_saved_record_matches_current_pb() {
        User user = TestFixtures.createUser(1L, "tester@cubinghub.com", "Tester", UserRole.ROLE_USER, UserStatus.ACTIVE);
        Record currentBestRecord = TestFixtures.createRecord(1L, user, EventType.WCA_333, 10000, Penalty.NONE, "best");
        Record sameTimeRecord = TestFixtures.createRecord(2L, user, EventType.WCA_333, 10000, Penalty.NONE, "same");
        UserPB existingPb = spy(UserPB.builder()
                .id(11L)
                .user(user)
                .eventType(EventType.WCA_333)
                .bestTimeMs(10000)
                .record(currentBestRecord)
                .build());
        RecordSaveRequest request = RecordSaveRequest.builder()
                .eventType(EventType.WCA_333)
                .timeMs(10000)
                .penalty(Penalty.NONE)
                .scramble("same")
                .build();

        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        when(recordRepository.save(any(Record.class))).thenReturn(sameTimeRecord);
        when(userPBRepository.findByUserAndEventType(user, EventType.WCA_333)).thenReturn(Optional.of(existingPb));

        recordService.saveRecord(user.getEmail(), request);

        verify(existingPb, never()).updateBestTime(any(), any());
        verify(userPBRepository, never()).save(any(UserPB.class));
    }

    @Test
    @DisplayName("존재하지 않는 사용자는 기록 저장에 실패한다")
    void should_throw_illegal_argument_exception_when_user_does_not_exist() {
        RecordSaveRequest request = RecordSaveRequest.builder()
                .eventType(EventType.WCA_333)
                .timeMs(11000)
                .penalty(Penalty.NONE)
                .scramble("scramble")
                .build();
        when(userRepository.findByEmail("missing@cubinghub.com")).thenReturn(Optional.empty());

        Throwable thrown = catchThrowable(() -> recordService.saveRecord("missing@cubinghub.com", request));

        assertThat(thrown)
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("User not found: missing@cubinghub.com");
    }

    @Test
    @DisplayName("랭킹 조회 시 순번을 1부터 차례로 부여한다")
    void should_assign_sequential_ranks_when_rankings_are_requested() {
        when(recordRepository.findTop100RankingsByEventType(EventType.WCA_333)).thenReturn(List.of(
                new RankingQueryResult("Alpha", EventType.WCA_333, 9800),
                new RankingQueryResult("Beta", EventType.WCA_333, 10100)
        ));

        List<RankingResponse> responses = recordService.getRankings(EventType.WCA_333);

        assertThat(responses).hasSize(2);
        assertThat(responses.get(0).getRank()).isEqualTo(1);
        assertThat(responses.get(0).getNickname()).isEqualTo("Alpha");
        assertThat(responses.get(1).getRank()).isEqualTo(2);
        assertThat(responses.get(1).getTimeMs()).isEqualTo(10100);
    }
}
