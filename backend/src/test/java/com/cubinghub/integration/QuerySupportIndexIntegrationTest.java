package com.cubinghub.integration;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

@DisplayName("쿼리 지원 인덱스 통합 테스트")
class QuerySupportIndexIntegrationTest extends JpaIntegrationTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    @DisplayName("records는 사용자 최근 기록 조회용 복합 인덱스를 생성한다")
    void should_create_recent_record_lookup_index_when_schema_is_initialized() {
        assertThat(findIndexColumns("records", "idx_record_user_created_at"))
                .containsExactly("user_id", "created_at");
    }

    @Test
    @DisplayName("posts는 최근글 조회와 카테고리 정렬용 복합 인덱스를 생성한다")
    void should_create_post_listing_indexes_when_schema_is_initialized() {
        assertThat(findIndexColumns("posts", "idx_post_created_at_id"))
                .containsExactly("created_at", "id");
        assertThat(findIndexColumns("posts", "idx_post_category_created_at_id"))
                .containsExactly("category", "created_at", "id");
    }

    private List<String> findIndexColumns(String tableName, String indexName) {
        return jdbcTemplate.queryForList(
                """
                        SELECT COLUMN_NAME
                        FROM INFORMATION_SCHEMA.STATISTICS
                        WHERE TABLE_SCHEMA = DATABASE()
                          AND TABLE_NAME = ?
                          AND INDEX_NAME = ?
                        ORDER BY SEQ_IN_INDEX
                        """,
                String.class,
                tableName,
                indexName
        );
    }
}
