package com.cubinghub.integration;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

@DisplayName("MySQL runtime 통합 테스트")
class MySqlVersionIntegrationTest extends JpaIntegrationTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    @DisplayName("통합 테스트는 MySQL 8.4.11과 production charset/collation을 사용한다")
    void should_use_mysql_8_4_11_with_production_character_defaults() {
        Map<String, Object> runtime = jdbcTemplate.queryForMap("""
                SELECT
                    VERSION() AS version,
                    @@character_set_server AS character_set_server,
                    @@collation_server AS collation_server
                """);

        assertThat(runtime.get("version")).isEqualTo("8.4.11");
        assertThat(runtime.get("character_set_server")).isEqualTo("utf8mb4");
        assertThat(runtime.get("collation_server")).isEqualTo("utf8mb4_0900_ai_ci");
    }
}
