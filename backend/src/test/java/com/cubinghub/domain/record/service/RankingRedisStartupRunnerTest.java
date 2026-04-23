package com.cubinghub.domain.record.service;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.context.ConfigurableApplicationContext;

@ExtendWith(MockitoExtension.class)
@DisplayName("RankingRedisStartupRunner 단위 테스트")
class RankingRedisStartupRunnerTest {

    @Mock
    private RankingRedisBackfillService rankingRedisBackfillService;

    @Mock
    private ConfigurableApplicationContext applicationContext;

    @Test
    @DisplayName("disabled 모드면 Redis 재구축을 실행하지 않는다")
    void should_not_rebuild_when_mode_is_disabled() throws Exception {
        RankingRedisStartupRunner runner = new RankingRedisStartupRunner(rankingRedisBackfillService, applicationContext);
        ReflectionTestUtils.setField(runner, "rebuildMode", "disabled");

        runner.run(null);

        verify(rankingRedisBackfillService, never()).rebuildAll();
        verify(applicationContext, never()).close();
    }

    @Test
    @DisplayName("startup 모드면 Redis 재구축만 실행하고 앱은 유지한다")
    void should_rebuild_without_closing_context_when_mode_is_startup() throws Exception {
        RankingRedisStartupRunner runner = new RankingRedisStartupRunner(rankingRedisBackfillService, applicationContext);
        ReflectionTestUtils.setField(runner, "rebuildMode", "startup");

        runner.run(null);

        verify(rankingRedisBackfillService).rebuildAll();
        verify(applicationContext, never()).close();
    }

    @Test
    @DisplayName("oneshot 모드면 Redis 재구축 후 앱 컨텍스트를 종료한다")
    void should_close_context_after_rebuild_when_mode_is_one_shot() throws Exception {
        RankingRedisStartupRunner runner = new RankingRedisStartupRunner(rankingRedisBackfillService, applicationContext);
        ReflectionTestUtils.setField(runner, "rebuildMode", "oneshot");

        runner.run(null);

        verify(rankingRedisBackfillService).rebuildAll();
        verify(applicationContext).close();
    }

    @Test
    @DisplayName("지원하지 않는 모드면 예외를 던진다")
    void should_throw_when_mode_is_not_supported() {
        assertThatThrownBy(() -> RankingRedisStartupRunner.normalizeMode("unexpected"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Unsupported ranking.redis.rebuild-mode");
    }
}
