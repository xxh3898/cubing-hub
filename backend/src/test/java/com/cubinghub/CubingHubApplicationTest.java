package com.cubinghub;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("CubingHubApplication 단위 테스트")
class CubingHubApplicationTest {

    @Test
    @DisplayName("환경변수가 oneshot이면 Redis 재구축 one-shot 모드로 판단한다")
    void should_return_true_when_env_value_is_one_shot() {
        boolean result = CubingHubApplication.isRankingRedisRebuildOneShot(new String[0], "oneshot");

        assertThat(result).isTrue();
    }

    @Test
    @DisplayName("커맨드라인 인자가 oneshot이면 Redis 재구축 one-shot 모드로 판단한다")
    void should_return_true_when_cli_arg_requests_one_shot_mode() {
        boolean result = CubingHubApplication.isRankingRedisRebuildOneShot(
                new String[]{"--ranking.redis.rebuild-mode=oneshot"},
                null
        );

        assertThat(result).isTrue();
    }

    @Test
    @DisplayName("환경변수와 인자가 모두 없으면 one-shot 모드가 아니다")
    void should_return_false_when_one_shot_mode_is_not_requested() {
        boolean result = CubingHubApplication.isRankingRedisRebuildOneShot(new String[0], null);

        assertThat(result).isFalse();
    }
}
