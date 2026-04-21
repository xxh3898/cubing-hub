package com.cubinghub.domain.record.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class RankingRedisStartupRunner implements ApplicationRunner {

    private final RankingRedisBackfillService rankingRedisBackfillService;

    @Value("${ranking.redis.rebuild-on-startup:false}")
    private boolean rebuildOnStartup;

    @Override
    public void run(ApplicationArguments args) {
        if (!rebuildOnStartup) {
            return;
        }

        log.info("Redis ranking rebuild on startup is enabled");
        rankingRedisBackfillService.rebuildAll();
    }
}
