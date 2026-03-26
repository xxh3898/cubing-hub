package com.cubinghub.domain.record;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * WCA(World Cube Association) 공식 종목 리스트
 */
@Getter
@RequiredArgsConstructor
public enum EventType {
    // Cube
    WCA_333("333", "3x3x3 Cube"),
    WCA_222("222", "2x2x2 Cube"),
    WCA_444("444", "4x4x4 Cube"),
    WCA_555("555", "5x5x5 Cube"),
    WCA_666("666", "6x6x6 Cube"),
    WCA_777("777", "7x7x7 Cube"),
    
    // Blindfolded
    WCA_333BF("333bf", "3x3x3 Blindfolded"),
    WCA_444BF("444bf", "4x4x4 Blindfolded"),
    WCA_555BF("555bf", "5x5x5 Blindfolded"),
    WCA_333MBF("333mbf", "3x3x3 Multi-Blind"),
    
    // Variation
    WCA_333OH("333oh", "3x3x3 One-Handed"),
    WCA_333FM("333fm", "3x3x3 Fewest Moves"),
    
    // Other
    WCA_CLOCK("clock", "Clock"),
    WCA_MINX("minx", "Megaminx"),
    WCA_PYRAM("pyram", "Pyraminx"),
    WCA_SKEWB("skewb", "Skewb"),
    WCA_SQ1("sq1", "Square-1");

    private final String wcaId;      // WCA 공식 API 연동용 식별자
    private final String description; // 프론트엔드 UI 표출용 텍스트
}
