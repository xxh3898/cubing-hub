package com.cubinghub.domain.record.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.cubinghub.domain.record.dto.request.RecordSaveRequest;
import com.cubinghub.domain.record.entity.EventType;
import com.cubinghub.domain.record.entity.Penalty;
import com.cubinghub.domain.record.entity.Record;
import com.cubinghub.domain.record.entity.UserPB;
import com.cubinghub.domain.record.repository.RecordRepository;
import com.cubinghub.domain.record.repository.UserPBRepository;
import com.cubinghub.domain.user.entity.User;
import com.cubinghub.domain.user.entity.UserRole;
import com.cubinghub.domain.user.entity.UserStatus;
import com.cubinghub.domain.user.repository.UserRepository;
import com.cubinghub.support.TestFixtures;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
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
    void saveRecord_DNF는_PB미갱신() {
        // given
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

        // when
        Long recordId = recordService.saveRecord(user.getEmail(), request);

        // then
        assertThat(recordId).isEqualTo(savedRecord.getId());
        verify(userPBRepository, never()).findByUserAndEventType(any(), any());
        verify(userPBRepository, never()).save(any(UserPB.class));
    }

    @Test
    @DisplayName("기존 PB보다 느린 기록은 PB를 유지한다")
    void saveRecord_느린기록은_PB유지() {
        // given
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

        // when
        Long recordId = recordService.saveRecord(user.getEmail(), request);

        // then
        assertThat(recordId).isEqualTo(slowerRecord.getId());
        verify(existingPb, never()).updateBestTime(any(), any());
        verify(userPBRepository, never()).save(any(UserPB.class));
    }

    @Test
    @DisplayName("존재하지 않는 사용자는 기록 저장에 실패한다")
    void saveRecord_사용자없음_예외() {
        // given
        RecordSaveRequest request = RecordSaveRequest.builder()
                .eventType(EventType.WCA_333)
                .timeMs(11000)
                .penalty(Penalty.NONE)
                .scramble("scramble")
                .build();
        when(userRepository.findByEmail("missing@cubinghub.com")).thenReturn(Optional.empty());

        // when
        Throwable thrown = catchThrowable(() -> recordService.saveRecord("missing@cubinghub.com", request));

        // then
        assertThat(thrown)
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("User not found: missing@cubinghub.com");
    }
}
