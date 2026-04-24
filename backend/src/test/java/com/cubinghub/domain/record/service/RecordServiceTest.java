package com.cubinghub.domain.record.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.cubinghub.common.exception.CustomApiException;
import com.cubinghub.domain.record.dto.request.RecordPenaltyUpdateRequest;
import com.cubinghub.domain.record.dto.request.RecordSaveRequest;
import com.cubinghub.domain.record.dto.response.RecordPenaltyUpdateResponse;
import com.cubinghub.domain.record.dto.response.RankingPageResponse;
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
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;

@ExtendWith(MockitoExtension.class)
@DisplayName("RecordService 단위 테스트")
class RecordServiceTest {

    @Mock
    private RecordRepository recordRepository;

    @Mock
    private UserPBRepository userPBRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private RankingRedisService rankingRedisService;

    private RecordService recordService;

    @BeforeEach
    void setUp() {
        recordService = new RecordService(recordRepository, userPBRepository, userRepository, rankingRedisService);
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
    @DisplayName("PLUS_TWO 기록 저장 시 PB는 페널티가 반영된 유효 시간으로 생성된다")
    void should_create_pb_with_effective_time_when_plus_two_record_is_saved() {
        User user = TestFixtures.createUser(1L, "tester@cubinghub.com", "Tester", UserRole.ROLE_USER, UserStatus.ACTIVE);
        Record savedRecord = TestFixtures.createRecord(10L, user, EventType.WCA_333, 9800, Penalty.PLUS_TWO, "scramble");
        RecordSaveRequest request = RecordSaveRequest.builder()
                .eventType(EventType.WCA_333)
                .timeMs(9800)
                .penalty(Penalty.PLUS_TWO)
                .scramble("scramble")
                .build();

        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        when(recordRepository.save(any(Record.class))).thenReturn(savedRecord);
        when(recordRepository.findBestRecordByUserIdAndEventType(user.getId(), EventType.WCA_333)).thenReturn(Optional.of(savedRecord));
        when(userPBRepository.findByUserAndEventType(user, EventType.WCA_333)).thenReturn(Optional.empty());

        Long recordId = recordService.saveRecord(user.getEmail(), request);

        ArgumentCaptor<UserPB> pbCaptor = ArgumentCaptor.forClass(UserPB.class);
        assertThat(recordId).isEqualTo(savedRecord.getId());
        verify(userPBRepository).save(pbCaptor.capture());
        verify(rankingRedisService).sync(any(UserPB.class));
        assertThat(pbCaptor.getValue().getBestTimeMs()).isEqualTo(11800);
        assertThat(pbCaptor.getValue().getRecord()).isEqualTo(savedRecord);
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
        when(recordRepository.findBestRecordByUserIdAndEventType(user.getId(), EventType.WCA_333)).thenReturn(Optional.of(savedRecord));
        when(userPBRepository.findByUserAndEventType(user, EventType.WCA_333)).thenReturn(Optional.empty());

        Long recordId = recordService.saveRecord(user.getEmail(), request);

        ArgumentCaptor<UserPB> pbCaptor = ArgumentCaptor.forClass(UserPB.class);
        assertThat(recordId).isEqualTo(savedRecord.getId());
        verify(userPBRepository).save(pbCaptor.capture());
        verify(rankingRedisService).sync(any(UserPB.class));
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
        when(recordRepository.findBestRecordByUserIdAndEventType(user.getId(), EventType.WCA_333)).thenReturn(Optional.of(fasterRecord));
        when(userPBRepository.findByUserAndEventType(user, EventType.WCA_333)).thenReturn(Optional.of(existingPb));

        Long recordId = recordService.saveRecord(user.getEmail(), request);

        assertThat(recordId).isEqualTo(fasterRecord.getId());
        verify(existingPb).updateBestTime(9500, fasterRecord);
        verify(rankingRedisService).sync(existingPb);
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
        when(recordRepository.findBestRecordByUserIdAndEventType(user.getId(), EventType.WCA_333)).thenReturn(Optional.of(currentBestRecord));
        when(userPBRepository.findByUserAndEventType(user, EventType.WCA_333)).thenReturn(Optional.of(existingPb));

        Long recordId = recordService.saveRecord(user.getEmail(), request);

        assertThat(recordId).isEqualTo(slowerRecord.getId());
        verify(existingPb, never()).updateBestTime(any(), any());
        verify(rankingRedisService, never()).sync(any());
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
        when(recordRepository.findBestRecordByUserIdAndEventType(user.getId(), EventType.WCA_333)).thenReturn(Optional.of(currentBestRecord));
        when(userPBRepository.findByUserAndEventType(user, EventType.WCA_333)).thenReturn(Optional.of(existingPb));

        recordService.saveRecord(user.getEmail(), request);

        verify(existingPb, never()).updateBestTime(any(), any());
        verify(rankingRedisService, never()).sync(any());
        verify(userPBRepository, never()).save(any(UserPB.class));
    }

    @Test
    @DisplayName("같은 PB 시간이지만 다른 기록이면 PB 기록 참조를 갱신한다")
    void should_update_existing_pb_when_best_time_is_same_but_record_is_different() {
        User user = TestFixtures.createUser(1L, "tester@cubinghub.com", "Tester", UserRole.ROLE_USER, UserStatus.ACTIVE);
        Record currentBestRecord = TestFixtures.createRecord(1L, user, EventType.WCA_333, 10000, Penalty.NONE, "best");
        Record sameTimeNewBestRecord = TestFixtures.createRecord(2L, user, EventType.WCA_333, 10000, Penalty.NONE, "same-new");
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
                .scramble("same-new")
                .build();

        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        when(recordRepository.save(any(Record.class))).thenReturn(sameTimeNewBestRecord);
        when(recordRepository.findBestRecordByUserIdAndEventType(user.getId(), EventType.WCA_333))
                .thenReturn(Optional.of(sameTimeNewBestRecord));
        when(userPBRepository.findByUserAndEventType(user, EventType.WCA_333)).thenReturn(Optional.of(existingPb));

        Long recordId = recordService.saveRecord(user.getEmail(), request);

        assertThat(recordId).isEqualTo(sameTimeNewBestRecord.getId());
        verify(existingPb).updateBestTime(10000, sameTimeNewBestRecord);
        verify(rankingRedisService).sync(existingPb);
        verify(userPBRepository, never()).save(any(UserPB.class));
    }

    @Test
    @DisplayName("존재하지 않는 사용자는 기록 저장 시 401 예외를 반환한다")
    void should_throw_unauthorized_exception_when_user_does_not_exist() {
        RecordSaveRequest request = RecordSaveRequest.builder()
                .eventType(EventType.WCA_333)
                .timeMs(11000)
                .penalty(Penalty.NONE)
                .scramble("scramble")
                .build();
        when(userRepository.findByEmail("missing@cubinghub.com")).thenReturn(Optional.empty());

        Throwable thrown = catchThrowable(() -> recordService.saveRecord("missing@cubinghub.com", request));

        assertThat(thrown).isInstanceOf(CustomApiException.class);
        CustomApiException exception = (CustomApiException) thrown;
        assertThat(exception.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(exception.getMessage()).isEqualTo("사용자를 찾을 수 없습니다.");
    }

    @Test
    @DisplayName("기록 페널티를 PLUS_TWO로 수정하면 PB를 다시 계산한다")
    void should_recalculate_pb_when_record_penalty_is_updated_to_plus_two() {
        User user = TestFixtures.createUser(1L, "tester@cubinghub.com", "Tester", UserRole.ROLE_USER, UserStatus.ACTIVE);
        Record currentBestRecord = TestFixtures.createRecord(10L, user, EventType.WCA_333, 10000, Penalty.NONE, "best");
        Record fallbackRecord = TestFixtures.createRecord(11L, user, EventType.WCA_333, 10500, Penalty.NONE, "fallback");
        UserPB existingPb = spy(UserPB.builder()
                .id(21L)
                .user(user)
                .eventType(EventType.WCA_333)
                .bestTimeMs(10000)
                .record(currentBestRecord)
                .build());
        RecordPenaltyUpdateRequest request = RecordPenaltyUpdateRequest.builder()
                .penalty(Penalty.PLUS_TWO)
                .build();

        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        when(recordRepository.findById(currentBestRecord.getId())).thenReturn(Optional.of(currentBestRecord));
        when(recordRepository.findBestRecordByUserIdAndEventType(user.getId(), EventType.WCA_333)).thenReturn(Optional.of(fallbackRecord));
        when(userPBRepository.findByUserAndEventType(user, EventType.WCA_333)).thenReturn(Optional.of(existingPb));

        RecordPenaltyUpdateResponse response = recordService.updateRecordPenalty(currentBestRecord.getId(), user.getEmail(), request);

        assertThat(response.getPenalty()).isEqualTo(Penalty.PLUS_TWO);
        assertThat(currentBestRecord.getPenalty()).isEqualTo(Penalty.PLUS_TWO);
        verify(existingPb).updateBestTime(10500, fallbackRecord);
        verify(rankingRedisService).sync(existingPb);
    }

    @Test
    @DisplayName("마지막 PB 기록을 DNF로 수정하면 PB를 제거한다")
    void should_delete_pb_when_only_best_record_is_updated_to_dnf() {
        User user = TestFixtures.createUser(1L, "tester@cubinghub.com", "Tester", UserRole.ROLE_USER, UserStatus.ACTIVE);
        Record currentBestRecord = TestFixtures.createRecord(10L, user, EventType.WCA_333, 10000, Penalty.NONE, "best");
        UserPB existingPb = UserPB.builder()
                .id(21L)
                .user(user)
                .eventType(EventType.WCA_333)
                .bestTimeMs(10000)
                .record(currentBestRecord)
                .build();
        RecordPenaltyUpdateRequest request = RecordPenaltyUpdateRequest.builder()
                .penalty(Penalty.DNF)
                .build();

        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        when(recordRepository.findById(currentBestRecord.getId())).thenReturn(Optional.of(currentBestRecord));
        when(recordRepository.findBestRecordByUserIdAndEventType(user.getId(), EventType.WCA_333)).thenReturn(Optional.empty());
        when(userPBRepository.findByUserAndEventType(user, EventType.WCA_333)).thenReturn(Optional.of(existingPb));

        RecordPenaltyUpdateResponse response = recordService.updateRecordPenalty(currentBestRecord.getId(), user.getEmail(), request);

        assertThat(response.getPenalty()).isEqualTo(Penalty.DNF);
        assertThat(response.getEffectiveTimeMs()).isNull();
        verify(userPBRepository).delete(existingPb);
        verify(rankingRedisService).remove(EventType.WCA_333, user.getId());
    }

    @Test
    @DisplayName("다른 사용자의 기록 페널티 수정은 금지된다")
    void should_throw_forbidden_exception_when_non_owner_updates_record_penalty() {
        User owner = TestFixtures.createUser(1L, "owner@cubinghub.com", "Owner", UserRole.ROLE_USER, UserStatus.ACTIVE);
        User otherUser = TestFixtures.createUser(2L, "other@cubinghub.com", "Other", UserRole.ROLE_USER, UserStatus.ACTIVE);
        Record record = TestFixtures.createRecord(10L, owner, EventType.WCA_333, 10000, Penalty.NONE, "best");
        RecordPenaltyUpdateRequest request = RecordPenaltyUpdateRequest.builder()
                .penalty(Penalty.PLUS_TWO)
                .build();

        when(userRepository.findByEmail(otherUser.getEmail())).thenReturn(Optional.of(otherUser));
        when(recordRepository.findById(record.getId())).thenReturn(Optional.of(record));

        Throwable thrown = catchThrowable(() -> recordService.updateRecordPenalty(record.getId(), otherUser.getEmail(), request));

        assertThat(thrown)
                .isInstanceOf(CustomApiException.class)
                .hasMessage("기록 수정 권한이 없습니다.");
        verify(userPBRepository, never()).delete(any());
    }

    @Test
    @DisplayName("존재하지 않는 기록 페널티 수정은 404 예외를 던진다")
    void should_throw_not_found_exception_when_record_to_update_does_not_exist() {
        User user = TestFixtures.createUser(1L, "tester@cubinghub.com", "Tester", UserRole.ROLE_USER, UserStatus.ACTIVE);
        RecordPenaltyUpdateRequest request = RecordPenaltyUpdateRequest.builder()
                .penalty(Penalty.PLUS_TWO)
                .build();

        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        when(recordRepository.findById(999L)).thenReturn(Optional.empty());

        Throwable thrown = catchThrowable(() -> recordService.updateRecordPenalty(999L, user.getEmail(), request));

        assertThat(thrown)
                .isInstanceOf(CustomApiException.class)
                .hasMessage("기록을 찾을 수 없습니다.");
        verify(recordRepository, never()).findBestRecordByUserIdAndEventType(any(), any());
    }

    @Test
    @DisplayName("현재 PB 기록을 삭제하면 다음 기록으로 PB를 다시 계산한다")
    void should_recalculate_pb_when_current_pb_record_is_deleted() {
        User user = TestFixtures.createUser(1L, "tester@cubinghub.com", "Tester", UserRole.ROLE_USER, UserStatus.ACTIVE);
        Record currentBestRecord = TestFixtures.createRecord(10L, user, EventType.WCA_333, 10000, Penalty.NONE, "best");
        Record fallbackRecord = TestFixtures.createRecord(11L, user, EventType.WCA_333, 10500, Penalty.NONE, "fallback");
        UserPB existingPb = spy(UserPB.builder()
                .id(21L)
                .user(user)
                .eventType(EventType.WCA_333)
                .bestTimeMs(10000)
                .record(currentBestRecord)
                .build());

        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        when(recordRepository.findById(currentBestRecord.getId())).thenReturn(Optional.of(currentBestRecord));
        when(userPBRepository.findByUserAndEventType(user, EventType.WCA_333))
                .thenReturn(Optional.of(existingPb), Optional.empty());
        when(recordRepository.findBestRecordByUserIdAndEventType(user.getId(), EventType.WCA_333)).thenReturn(Optional.of(fallbackRecord));

        recordService.deleteRecord(currentBestRecord.getId(), user.getEmail());

        ArgumentCaptor<UserPB> pbCaptor = ArgumentCaptor.forClass(UserPB.class);
        verify(userPBRepository).delete(existingPb);
        verify(recordRepository).delete(currentBestRecord);
        verify(recordRepository).flush();
        verify(userPBRepository).save(pbCaptor.capture());
        verify(rankingRedisService).sync(any(UserPB.class));
        assertThat(pbCaptor.getValue().getBestTimeMs()).isEqualTo(10500);
        assertThat(pbCaptor.getValue().getRecord()).isEqualTo(fallbackRecord);
    }

    @Test
    @DisplayName("마지막 PB 기록을 삭제하면 PB를 제거하고 새 PB는 만들지 않는다")
    void should_remove_pb_without_recreating_when_last_rankable_record_is_deleted() {
        User user = TestFixtures.createUser(1L, "tester@cubinghub.com", "Tester", UserRole.ROLE_USER, UserStatus.ACTIVE);
        Record currentBestRecord = TestFixtures.createRecord(10L, user, EventType.WCA_333, 10000, Penalty.NONE, "best");
        UserPB existingPb = UserPB.builder()
                .id(21L)
                .user(user)
                .eventType(EventType.WCA_333)
                .bestTimeMs(10000)
                .record(currentBestRecord)
                .build();

        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        when(recordRepository.findById(currentBestRecord.getId())).thenReturn(Optional.of(currentBestRecord));
        when(userPBRepository.findByUserAndEventType(user, EventType.WCA_333))
                .thenReturn(Optional.of(existingPb), Optional.empty());
        when(recordRepository.findBestRecordByUserIdAndEventType(user.getId(), EventType.WCA_333)).thenReturn(Optional.empty());

        recordService.deleteRecord(currentBestRecord.getId(), user.getEmail());

        verify(userPBRepository).delete(existingPb);
        verify(recordRepository).delete(currentBestRecord);
        verify(recordRepository).flush();
        verify(rankingRedisService).remove(EventType.WCA_333, user.getId());
        verify(userPBRepository, never()).save(any(UserPB.class));
    }

    @Test
    @DisplayName("PB 삭제 직후 조회에 이전 PB가 남아 있어도 랭킹 제거를 수행한다")
    void should_remove_ranking_when_deleted_pb_is_still_returned_during_recalculation() {
        User user = TestFixtures.createUser(1L, "tester@cubinghub.com", "Tester", UserRole.ROLE_USER, UserStatus.ACTIVE);
        Record currentBestRecord = TestFixtures.createRecord(10L, user, EventType.WCA_333, 10000, Penalty.NONE, "best");
        UserPB existingPb = UserPB.builder()
                .id(21L)
                .user(user)
                .eventType(EventType.WCA_333)
                .bestTimeMs(10000)
                .record(currentBestRecord)
                .build();

        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        when(recordRepository.findById(currentBestRecord.getId())).thenReturn(Optional.of(currentBestRecord));
        when(userPBRepository.findByUserAndEventType(user, EventType.WCA_333))
                .thenReturn(Optional.of(existingPb), Optional.of(existingPb));
        when(recordRepository.findBestRecordByUserIdAndEventType(user.getId(), EventType.WCA_333)).thenReturn(Optional.empty());

        recordService.deleteRecord(currentBestRecord.getId(), user.getEmail());

        verify(userPBRepository, org.mockito.Mockito.times(2)).delete(existingPb);
        verify(rankingRedisService).remove(EventType.WCA_333, user.getId());
    }

    @Test
    @DisplayName("현재 PB가 아닌 DNF 기록 삭제는 PB 삭제와 재계산을 수행하지 않는다")
    void should_skip_pb_delete_and_recalculation_when_deleted_record_is_not_rankable_and_not_current_pb() {
        User user = TestFixtures.createUser(1L, "tester@cubinghub.com", "Tester", UserRole.ROLE_USER, UserStatus.ACTIVE);
        Record deletedRecord = TestFixtures.createRecord(10L, user, EventType.WCA_333, 10000, Penalty.DNF, "dnf");

        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        when(recordRepository.findById(deletedRecord.getId())).thenReturn(Optional.of(deletedRecord));
        when(userPBRepository.findByUserAndEventType(user, EventType.WCA_333)).thenReturn(Optional.empty());

        recordService.deleteRecord(deletedRecord.getId(), user.getEmail());

        verify(userPBRepository, never()).delete(any(UserPB.class));
        verify(recordRepository).delete(deletedRecord);
        verify(recordRepository).flush();
        verify(rankingRedisService, never()).remove(any(), any());
        verify(recordRepository, never()).findBestRecordByUserIdAndEventType(any(), any());
    }

    @Test
    @DisplayName("현재 PB가 아닌 랭커블 기록 삭제 후 PB 변화가 없으면 랭킹 동기화를 건너뛴다")
    void should_skip_ranking_sync_when_deleted_rankable_record_does_not_change_pb() {
        User user = TestFixtures.createUser(1L, "tester@cubinghub.com", "Tester", UserRole.ROLE_USER, UserStatus.ACTIVE);
        Record deletedRecord = TestFixtures.createRecord(10L, user, EventType.WCA_333, 13000, Penalty.NONE, "slow");

        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        when(recordRepository.findById(deletedRecord.getId())).thenReturn(Optional.of(deletedRecord));
        when(userPBRepository.findByUserAndEventType(user, EventType.WCA_333)).thenReturn(Optional.empty());
        when(recordRepository.findBestRecordByUserIdAndEventType(user.getId(), EventType.WCA_333)).thenReturn(Optional.empty());

        recordService.deleteRecord(deletedRecord.getId(), user.getEmail());

        verify(recordRepository).delete(deletedRecord);
        verify(recordRepository).flush();
        verify(rankingRedisService, never()).remove(any(), any());
        verify(rankingRedisService, never()).sync(any());
        verify(userPBRepository, never()).delete(any());
        verify(userPBRepository, never()).save(any());
    }

    @Test
    @DisplayName("다른 사용자의 기록 삭제는 금지된다")
    void should_throw_forbidden_exception_when_non_owner_deletes_record() {
        User owner = TestFixtures.createUser(1L, "owner@cubinghub.com", "Owner", UserRole.ROLE_USER, UserStatus.ACTIVE);
        User otherUser = TestFixtures.createUser(2L, "other@cubinghub.com", "Other", UserRole.ROLE_USER, UserStatus.ACTIVE);
        Record record = TestFixtures.createRecord(10L, owner, EventType.WCA_333, 10000, Penalty.NONE, "best");

        when(userRepository.findByEmail(otherUser.getEmail())).thenReturn(Optional.of(otherUser));
        when(recordRepository.findById(record.getId())).thenReturn(Optional.of(record));

        Throwable thrown = catchThrowable(() -> recordService.deleteRecord(record.getId(), otherUser.getEmail()));

        assertThat(thrown)
                .isInstanceOf(CustomApiException.class)
                .hasMessage("기록 삭제 권한이 없습니다.");
        verify(recordRepository, never()).delete(any());
    }

    @Test
    @DisplayName("존재하지 않는 기록 삭제는 404 예외를 던진다")
    void should_throw_not_found_exception_when_record_to_delete_does_not_exist() {
        User user = TestFixtures.createUser(1L, "tester@cubinghub.com", "Tester", UserRole.ROLE_USER, UserStatus.ACTIVE);

        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        when(recordRepository.findById(999L)).thenReturn(Optional.empty());

        Throwable thrown = catchThrowable(() -> recordService.deleteRecord(999L, user.getEmail()));

        assertThat(thrown)
                .isInstanceOf(CustomApiException.class)
                .hasMessage("기록을 찾을 수 없습니다.");
        verify(recordRepository, never()).delete(any());
    }

    @Test
    @DisplayName("랭킹 조회는 저장소가 반환한 실제 순위를 그대로 응답에 담는다")
    void should_return_global_rank_when_rankings_are_requested_with_pagination() {
        when(userPBRepository.searchRankings(eq(EventType.WCA_333), eq("a"), eq(PageRequest.of(1, 2))))
                .thenReturn(new PageImpl<>(
                        List.of(
                                new RankingQueryResult(3, "Alpha", EventType.WCA_333, 9800),
                                new RankingQueryResult(4, "Beta", EventType.WCA_333, 10100)
                        ),
                        PageRequest.of(1, 2),
                        5
                ));

        RankingPageResponse response = recordService.getRankings(EventType.WCA_333, "a", 2, 2);

        assertThat(response.getItems()).hasSize(2);
        assertThat(response.getItems().get(0).getRank()).isEqualTo(3);
        assertThat(response.getItems().get(0).getNickname()).isEqualTo("Alpha");
        assertThat(response.getItems().get(1).getRank()).isEqualTo(4);
        assertThat(response.getItems().get(1).getTimeMs()).isEqualTo(10100);
        assertThat(response.getPage()).isEqualTo(2);
        assertThat(response.getSize()).isEqualTo(2);
        assertThat(response.getTotalElements()).isEqualTo(5);
        assertThat(response.getTotalPages()).isEqualTo(3);
        assertThat(response.isHasNext()).isTrue();
        assertThat(response.isHasPrevious()).isTrue();
    }

    @Test
    @DisplayName("기본 랭킹 조회는 Redis가 준비되면 Redis 경로를 사용한다")
    void should_return_rankings_from_redis_when_nickname_is_blank_and_redis_is_ready() {
        RankingPageResponse redisResponse = new RankingPageResponse(
                List.of(),
                1,
                25,
                0L,
                0,
                false,
                false
        );

        when(rankingRedisService.isReady(EventType.WCA_333)).thenReturn(true);
        when(rankingRedisService.getRankings(EventType.WCA_333, 1, 25)).thenReturn(redisResponse);

        RankingPageResponse response = recordService.getRankings(EventType.WCA_333, null, 1, 25);

        assertThat(response).isSameAs(redisResponse);
        verify(rankingRedisService).getRankings(EventType.WCA_333, 1, 25);
        verify(userPBRepository, never()).searchRankings(any(), any(), any());
    }

    @Test
    @DisplayName("기본 랭킹 조회는 Redis가 준비되지 않으면 MySQL 경로로 fallback한다")
    void should_fallback_to_mysql_when_redis_is_not_ready() {
        when(rankingRedisService.isReady(EventType.WCA_333)).thenReturn(false);
        when(userPBRepository.searchRankings(eq(EventType.WCA_333), eq(null), eq(PageRequest.of(0, 25))))
                .thenReturn(new PageImpl<>(
                        List.of(new RankingQueryResult(1, "Alpha", EventType.WCA_333, 9800)),
                        PageRequest.of(0, 25),
                        1
                ));

        RankingPageResponse response = recordService.getRankings(EventType.WCA_333, null, 1, 25);

        assertThat(response.getItems()).extracting("nickname").containsExactly("Alpha");
        verify(rankingRedisService, never()).getRankings(any(), any(), any());
        verify(userPBRepository).searchRankings(EventType.WCA_333, null, PageRequest.of(0, 25));
    }

    @Test
    @DisplayName("랭킹 조회 page가 1보다 작으면 예외를 던진다")
    void should_throw_illegal_argument_exception_when_ranking_page_is_less_than_one() {
        Throwable thrown = catchThrowable(() -> recordService.getRankings(EventType.WCA_333, null, 0, 25));

        assertThat(thrown)
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("잘못된 페이지 번호입니다.");
        verify(userPBRepository, never()).searchRankings(any(), any(), any());
    }

    @Test
    @DisplayName("랭킹 조회 size가 1보다 작으면 예외를 던진다")
    void should_throw_illegal_argument_exception_when_ranking_size_is_less_than_one() {
        Throwable thrown = catchThrowable(() -> recordService.getRankings(EventType.WCA_333, null, 1, 0));

        assertThat(thrown)
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("한 번에 조회할 수 있는 개수는 1개 이상 100개 이하여야 합니다.");
        verify(userPBRepository, never()).searchRankings(any(), any(), any());
    }

    @Test
    @DisplayName("랭킹 조회 size가 범위를 벗어나면 예외를 던진다")
    void should_throw_illegal_argument_exception_when_ranking_size_is_out_of_range() {
        Throwable thrown = catchThrowable(() -> recordService.getRankings(EventType.WCA_333, null, 1, 101));

        assertThat(thrown)
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("한 번에 조회할 수 있는 개수는 1개 이상 100개 이하여야 합니다.");
        verify(userPBRepository, never()).searchRankings(any(), any(), any());
    }
}
