package com.cube.cube_server.domain;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum AchievementType {
    // Speed Badges
    SPEED_SUB_60("1분 돌파", "싱글 60초 벽을 깼습니다!"),
    SPEED_SUB_30("30초 돌파", "싱글 30초 벽을 깼습니다!"),
    SPEED_SUB_20("20초 돌파", "싱글 20초 벽을 깼습니다!"),
    SPEED_SUB_10("10초 돌파", "싱글 10초 벽을 깼습니다!"),
    // Count Badges
    COUNT_10("시작이 반", "누적 10회 솔빙을 달성했습니다."),
    COUNT_100("꾸준함의 가치", "누적 100회 솔빙을 달성했습니다."),
    COUNT_1000("큐브 마스터", "누적 1000회 솔빙을 달성했습니다.");

    private final String name;
    private final String description;
}
