package com.cubinghub.common.util;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

import com.cubinghub.domain.record.EventType;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;

@NoArgsConstructor(access = AccessLevel.PRIVATE)
public class ScrambleGenerator {

    private static final String[] FACES = {"U", "D", "L", "R", "F", "B"};
    private static final String[] MODS = {"", "'", "2"};
    private static final Random RANDOM = new Random();

    public static String generate(EventType eventType) {
        if (eventType == null) {
            throw new IllegalArgumentException("EventType cannot be null");
        }

        return switch (eventType) {
            case WCA_333, WCA_333OH -> generate3x3x3(20);
            case WCA_222 -> generate2x2x2(10);
            default -> "Scramble for " + eventType.getWcaId() + " is not yet implemented";
        };
    }

    private static String generate3x3x3(int length) {
        List<String> scramble = new ArrayList<>();
        int lastFaceIdx = -1;
        int secondLastFaceIdx = -1;

        while (scramble.size() < length) {
            int faceIdx = RANDOM.nextInt(FACES.length);

            // 1. 연속된 면 중복 방지 (e.g. R R)
            if (faceIdx == lastFaceIdx) {
                continue;
            }

            // 2. 동일 축(Axis) 3회 연속 회전 방지 (e.g. R L R)
            if (secondLastFaceIdx != -1 && (faceIdx / 2 == lastFaceIdx / 2) && (faceIdx / 2 == secondLastFaceIdx / 2)) {
                continue;
            }

            String move = FACES[faceIdx] + MODS[RANDOM.nextInt(MODS.length)];
            scramble.add(move);

            secondLastFaceIdx = lastFaceIdx;
            lastFaceIdx = faceIdx;
        }

        return String.join(" ", scramble);
    }

    private static String generate2x2x2(int length) {
        // 2x2x2는 보통 U, R, F 면만 사용하여 생성 (고정 면 기준)
        String[] faces2x2 = {"U", "R", "F"};
        List<String> scramble = new ArrayList<>();
        int lastFaceIdx = -1;

        while (scramble.size() < length) {
            int faceIdx = RANDOM.nextInt(faces2x2.length);
            if (faceIdx == lastFaceIdx) {
                continue;
            }

            String move = faces2x2[faceIdx] + MODS[RANDOM.nextInt(MODS.length)];
            scramble.add(move);
            lastFaceIdx = faceIdx;
        }

        return String.join(" ", scramble);
    }
}
