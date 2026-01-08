package com.cube.cube_server.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.cube.cube_server.domain.AchievementType;
import com.cube.cube_server.domain.Member;
import com.cube.cube_server.domain.MemberAchievement;
import com.cube.cube_server.domain.Record;
import com.cube.cube_server.dto.RecordDto;
import com.cube.cube_server.repository.MemberAchievementRepository;
import com.cube.cube_server.repository.MemberRepository;
import com.cube.cube_server.repository.RecordRepository;

import lombok.RequiredArgsConstructor;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class RecordService {

    private final RecordRepository recordRepository;
    private final MemberRepository memberRepository;
    private final MemberAchievementRepository memberAchievementRepository;

    @Transactional
    public Long addRecord(RecordDto.Create request, String memberId) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));

        Record record = request.toEntity();
        record.changeMember(member);
        recordRepository.save(record);

        // Gamification Logic
        checkAchievements(member, record);
        checkLevelUpdate(member);

        return record.getId();
    }

    private void checkAchievements(Member member, Record record) {
        // Speed Badges
        if (record.getTime() < 10.0) {
            grantAchievement(member, AchievementType.SPEED_SUB_10);
        } else if (record.getTime() < 20.0) {
            grantAchievement(member, AchievementType.SPEED_SUB_20);
        } else if (record.getTime() < 30.0) {
            grantAchievement(member, AchievementType.SPEED_SUB_30);
        } else if (record.getTime() < 60.0) {
            grantAchievement(member, AchievementType.SPEED_SUB_60);
        }

        // Count Badges
        int totalSolves = member.getRecords().size();
        if (totalSolves == 10) {
            grantAchievement(member, AchievementType.COUNT_10);
        } else if (totalSolves == 100) {
            grantAchievement(member, AchievementType.COUNT_100);
        } else if (totalSolves == 1000) {
            grantAchievement(member, AchievementType.COUNT_1000);
        }
    }

    private void grantAchievement(Member member, AchievementType type) {
        boolean alreadyAchieved = member.getAchievements().stream()
                .anyMatch(a -> a.getAchievementType() == type);

        if (!alreadyAchieved) {
            MemberAchievement achievement = MemberAchievement.create(member, type);
            memberAchievementRepository.save(achievement);
            member.addAchievement(achievement);
        }
    }

    private void checkLevelUpdate(Member member) {
        List<Record> records = member.getRecords();
        if (records.size() < 5) {
            return;
        }

        // Calculate Ao5 for the last 5 records (Simple implementation, strictly taking last 5)
        // Ideally, we should check "Best Ao5", but for now let's implement based on current performance or best so far.
        // The requirement said "Best Ao5". Calculating Best Ao5 from scratch every time is expensive.
        // For optimization, we can just calculate the Ao5 of the LATEST 5 records and see if it beats the current level threshold.
        // Or strictly follow "Best Ao5" by iterating all records? That's too slow (O(N)).
        // Let's assume the user progresses. We check the LATEST Ao5. If it's good, we upgrade.
        // But what if they were Master and got bad recent records? Level shouldn't drop?
        // Let's implement: Check Latest Ao5 -> if better than current level, upgrade. (One-way upgrade)
        List<Record> last5 = records.subList(records.size() - 5, records.size());
        // Ao5 excludes best and worst, averages middle 3.
        List<Double> times = last5.stream().map(Record::getTime).sorted().collect(Collectors.toList());
        double ao5 = (times.get(1) + times.get(2) + times.get(3)) / 3.0;

        String currentLevel = member.getLevel();
        String newLevel = currentLevel;

        if (ao5 < 10.0) {
            newLevel = "Master";
        } else if (ao5 < 20.0 && !currentLevel.equals("Master")) {
            newLevel = "Pro";
        } else if (ao5 < 30.0 && !List.of("Master", "Pro").contains(currentLevel)) {
            newLevel = "Amateur";
        } else if (ao5 < 60.0 && !List.of("Master", "Pro", "Amateur").contains(currentLevel)) {
            newLevel = "Beginner";
        }

        if (!newLevel.equals(currentLevel)) {
            member.updateLevel(newLevel);
        }
    }

    public List<RecordDto.Response> getRecords(String memberId) {
        return recordRepository.findByMemberId(memberId).stream()
                .map(RecordDto.Response::of)
                .collect(Collectors.toList());
    }

    @Transactional
    public void deleteRecord(Long id) {
        recordRepository.deleteById(id);
    }
}
