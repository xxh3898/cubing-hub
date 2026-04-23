package com.cubinghub.domain.record.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class RankingRedisStartupRunner implements ApplicationRunner {

    static final String REBUILD_MODE_DISABLED = "disabled";
    static final String REBUILD_MODE_STARTUP = "startup";
    static final String REBUILD_MODE_ONESHOT = "oneshot";

    private final RankingRedisBackfillService rankingRedisBackfillService;
    private final ConfigurableApplicationContext applicationContext;

    @Value("${ranking.redis.rebuild-mode:disabled}")
    private String rebuildMode;

    @Override
    public void run(ApplicationArguments args) {
        String normalizedMode = normalizeMode(rebuildMode);

        if (REBUILD_MODE_DISABLED.equals(normalizedMode)) {
            return;
        }

        log.info("Redis ranking rebuild is enabled - mode: {}", normalizedMode);
        rankingRedisBackfillService.rebuildAll();

        if (REBUILD_MODE_ONESHOT.equals(normalizedMode)) {
            log.info("Redis ranking rebuild one-shot mode completed. Closing application context");
            applicationContext.close();
        }
    }

    static String normalizeMode(String rebuildMode) {
        if (rebuildMode == null || rebuildMode.isBlank()) {
            return REBUILD_MODE_DISABLED;
        }

        String normalizedMode = rebuildMode.trim().toLowerCase();

        return switch (normalizedMode) {
            case REBUILD_MODE_DISABLED, REBUILD_MODE_STARTUP, REBUILD_MODE_ONESHOT -> normalizedMode;
            default -> throw new IllegalStateException("Unsupported ranking.redis.rebuild-mode: " + rebuildMode);
        };
    }
}
