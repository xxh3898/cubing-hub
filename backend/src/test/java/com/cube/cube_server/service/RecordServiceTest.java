package com.cube.cube_server.service;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import static org.mockito.Mockito.verify;
import org.mockito.junit.jupiter.MockitoExtension;

import com.cube.cube_server.domain.AchievementType;
import com.cube.cube_server.domain.Member;
import com.cube.cube_server.domain.MemberAchievement;
import com.cube.cube_server.domain.Record;
import com.cube.cube_server.dto.RecordDto;
import com.cube.cube_server.repository.MemberAchievementRepository;
import com.cube.cube_server.repository.MemberRepository;
import com.cube.cube_server.repository.RecordRepository;

@ExtendWith(MockitoExtension.class)
public class RecordServiceTest {

    @InjectMocks
    private RecordService recordService;

    @Mock
    private RecordRepository recordRepository;

    @Mock
    private MemberRepository memberRepository;

    @Mock
    private MemberAchievementRepository memberAchievementRepository;

    @Test
    @DisplayName("기록 추가 시 1분 미만이면 SPEED_SUB_60 뱃지 획득")
    void addRecord_Sub60_UnlocksBadge() {
        // given
        String memberId = "testuser";
        Member member = Member.builder()
                .id(memberId)
                .name("Test User")
                .age(25)
                .build();

        RecordDto.Create request = new RecordDto.Create(null, 59.00, "R U R' U'");

        given(memberRepository.findById(memberId)).willReturn(Optional.of(member));
        given(recordRepository.save(any(Record.class))).willAnswer(invocation -> {
            Record r = invocation.getArgument(0);
            return Record.builder()
                    .id(1L)
                    .time(r.getTime())
                    .scramble(r.getScramble())
                    .member(r.getMember())
                    .build();
        });

        // when
        recordService.addRecord(request, memberId);

        // then
        verify(memberAchievementRepository).save(any(MemberAchievement.class));
        assertEquals(1, member.getAchievements().size());
        assertEquals(AchievementType.SPEED_SUB_60, member.getAchievements().get(0).getAchievementType());
    }

    @Test
    @DisplayName("최근 5회 평균(Ao5)이 20초 미만이면 Pro 레벨로 승급")
    void addRecord_LevelUp_Pro() {
        // given
        String memberId = "testuser";
        Member member = Member.builder()
                .id(memberId)
                .name("Test User")
                .age(25)
                .level("Rookie")
                .build();

        // Add 4 existing records (15s each)
        for (int i = 0; i < 4; i++) {
            Record r = Record.builder().time(15.0).scramble("SC").member(member).build();
            member.getRecords().add(r);
        }

        RecordDto.Create request = new RecordDto.Create(null, 15.0, "R U R' U'"); // 5th record

        given(memberRepository.findById(memberId)).willReturn(Optional.of(member));
        given(recordRepository.save(any(Record.class))).willAnswer(invocation -> invocation.getArgument(0));

        // when
        recordService.addRecord(request, memberId);

        // then
        assertEquals("Pro", member.getLevel());
    }
}
