package com.cubinghub.common.util;

import com.cubinghub.domain.record.entity.EventType;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

@NoArgsConstructor(access = AccessLevel.PRIVATE)
public class ScrambleGenerator {

    private static final String[] FACES = {"U", "D", "L", "R", "F", "B"};
    private static final String[] MODS = {"", "'", "2"};
    private static final Random RANDOM = new Random();

    public static String generate(EventType eventType) {
        validateEventType(eventType);

        return generate(eventType, RANDOM);
    }

    public static String generateDaily(EventType eventType, LocalDate date) {
        validateEventType(eventType);

        if (date == null) {
            throw new IllegalArgumentException("Date cannot be null");
        }

        return generate(eventType, new Random(dailySeed(eventType, date)));
    }

    private static String generate(EventType eventType, Random random) {
        return switch (eventType) {
            case WCA_333, WCA_333OH -> generate3x3x3(20, random);
            case WCA_222 -> generate2x2x2(10, random);
            default -> "Scramble for " + eventType.getWcaId() + " is not yet implemented";
        };
    }

    private static String generate3x3x3(int length, Random random) {
        List<String> scramble = new ArrayList<>();
        int lastFaceIdx = -1;
        int secondLastFaceIdx = -1;

        while (scramble.size() < length) {
            int faceIdx = random.nextInt(FACES.length);

            // 1. 연속된 면 중복 방지 (e.g. R R)
            if (faceIdx == lastFaceIdx) {
                continue;
            }

            // 2. 동일 축(Axis) 3회 연속 회전 방지 (e.g. R L R)
            if (secondLastFaceIdx != -1 && (faceIdx / 2 == lastFaceIdx / 2) && (faceIdx / 2 == secondLastFaceIdx / 2)) {
                continue;
            }

            String move = FACES[faceIdx] + MODS[random.nextInt(MODS.length)];
            scramble.add(move);

            secondLastFaceIdx = lastFaceIdx;
            lastFaceIdx = faceIdx;
        }

        return String.join(" ", scramble);
    }

    private static String generate2x2x2(int length, Random random) {
        // 2x2x2는 보통 U, R, F 면만 사용하여 생성 (고정 면 기준)
        String[] faces2x2 = {"U", "R", "F"};
        List<String> scramble = new ArrayList<>();
        int lastFaceIdx = -1;

        while (scramble.size() < length) {
            int faceIdx = random.nextInt(faces2x2.length);
            if (faceIdx == lastFaceIdx) {
                continue;
            }

            String move = faces2x2[faceIdx] + MODS[random.nextInt(MODS.length)];
            scramble.add(move);
            lastFaceIdx = faceIdx;
        }

        return String.join(" ", scramble);
    }

    private static void validateEventType(EventType eventType) {
        if (eventType == null) {
            throw new IllegalArgumentException("EventType cannot be null");
        }
    }

    private static long dailySeed(EventType eventType, LocalDate date) {
        return (31L * eventType.name().hashCode()) + date.toEpochDay();
    }
}
