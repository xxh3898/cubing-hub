package com.cubinghub.integration;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.assertj.core.api.Assertions.assertThat;

class InfrastructureConnectivityTest extends BaseIntegrationTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private RedisTemplate<String, Object> redisTemplate;

    @Test
    @DisplayName("MySQL 컨테이너 연결 및 쿼리 실행 확인")
    void mysqlConnectionTest() {
        Integer result = jdbcTemplate.queryForObject("SELECT 1", Integer.class);
        assertThat(result).isEqualTo(1);
    }

    @Test
    @DisplayName("Redis 컨테이너 연결 및 데이터 저장/조회 확인")
    void redisConnectionTest() {
        String key = "test:connection";
        String value = "success";

        redisTemplate.opsForValue().set(key, value);
        Object retrieved = redisTemplate.opsForValue().get(key);

        assertThat(retrieved).isEqualTo(value);
    }
}
