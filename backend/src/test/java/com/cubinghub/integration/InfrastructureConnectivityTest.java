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
    void should_return_one_when_mysql_select_one_is_executed() {
        Integer result = jdbcTemplate.queryForObject("SELECT 1", Integer.class);
        assertThat(result).isEqualTo(1);
    }

    @Test
    @DisplayName("Redis 컨테이너 연결 및 데이터 저장/조회 확인")
    void should_store_and_load_value_when_redis_connection_is_available() {
        String key = "test:connection";
        String value = "success";

        redisTemplate.opsForValue().set(key, value);
        Object retrieved = redisTemplate.opsForValue().get(key);

        assertThat(retrieved).isEqualTo(value);
    }
}
