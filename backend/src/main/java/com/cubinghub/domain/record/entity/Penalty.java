package com.cubinghub.domain.record.entity;

public enum Penalty {
    NONE(0, true),
    PLUS_TWO(2000, true),
    DNF(0, false);

    public static final int PLUS_TWO_MILLIS = 2000;

    private final int additionalTimeMs;
    private final boolean rankable;

    Penalty(int additionalTimeMs, boolean rankable) {
        this.additionalTimeMs = additionalTimeMs;
        this.rankable = rankable;
    }

    public Integer applyTo(Integer timeMs) {
        if (!rankable) {
            return null;
        }
        return timeMs + additionalTimeMs;
    }

    public boolean isRankable() {
        return rankable;
    }
}
