package com.cubinghub.domain.record;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.cubinghub.domain.record.entity.EventType;
import com.cubinghub.domain.record.entity.InputMethod;
import com.cubinghub.domain.record.repository.RecordRepository;
import com.cubinghub.domain.record.repository.UserPBRepository;
import com.cubinghub.domain.user.repository.UserRepository;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.util.TestPropertyValues;
import org.springframework.context.ApplicationContextInitializer;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.utility.DockerImageName;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@ActiveProfiles("test")
@ContextConfiguration(initializers = RecordFoundationMigrationIntegrationTest.MigrationInitializer.class)
@DisplayName("Record Foundation Flyway upgrade 통합 테스트")
class RecordFoundationMigrationIntegrationTest {

    private static final String SUBMISSION_ID = "d9428888-122b-4d3e-a58e-790c4e5f97ad";

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private RecordRepository recordRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserPBRepository userPBRepository;

    @Test
    @DisplayName("V2 legacy Record와 PB를 보존하며 V3 schema를 application mapping으로 읽는다")
    void should_preserve_legacy_record_and_pb_when_v3_migration_is_applied() {
        var legacyRecord = recordRepository.findById(100L).orElseThrow();
        var legacyUser = userRepository.findById(1L).orElseThrow();
        var legacyPb = userPBRepository.findByUserAndEventType(legacyUser, EventType.WCA_333).orElseThrow();

        assertThat(legacyRecord.getScramble()).isEqualTo("legacy scramble");
        assertThat(legacyRecord.getInputMethod()).isEqualTo(InputMethod.UNKNOWN);
        assertThat(legacyRecord.getClientSubmissionId()).isNull();
        assertThat(legacyRecord.getClientSubmissionPayloadHash()).isNull();
        assertThat(legacyPb.getRecord().getId()).isEqualTo(legacyRecord.getId());
        assertThat(legacyPb.getBestTimeMs()).isEqualTo(12345);
    }

    @Test
    @DisplayName("MySQL 8.4.11에서 기존 Flyway history와 table collation을 유지한다")
    void should_run_existing_migrations_on_mysql_8_4_11() {
        String version = jdbcTemplate.queryForObject("SELECT VERSION()", String.class);
        Integer migrationCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM flyway_schema_history WHERE success = 1",
                Integer.class
        );
        String recordsCollation = jdbcTemplate.queryForObject("""
                SELECT table_collation
                FROM information_schema.tables
                WHERE table_schema = DATABASE()
                  AND table_name = 'records'
                """, String.class);

        assertThat(version).isEqualTo("8.4.11");
        assertThat(migrationCount).isEqualTo(3);
        assertThat(recordsCollation).isEqualTo("utf8mb4_unicode_ci");
    }

    @Test
    @DisplayName("V3 columns와 Record 조회 index는 합의한 type과 nullability를 가진다")
    void should_create_record_foundation_columns_and_indexes() {
        assertColumn("input_method", "varchar", 32L, "YES");
        assertColumn("client_submission_id", "char", 36L, "YES");
        assertColumn("client_submission_payload_hash", "binary", 32L, "YES");

        assertIndexColumns(
                "idx_record_user_event_created_at_id",
                "user_id",
                "event_type",
                "created_at",
                "id"
        );
        assertIndexColumns("uk_record_user_client_submission", "user_id", "client_submission_id");
        Integer nonUnique = jdbcTemplate.queryForObject("""
                SELECT non_unique
                FROM information_schema.statistics
                WHERE table_schema = DATABASE()
                  AND table_name = 'records'
                  AND index_name = 'uk_record_user_client_submission'
                LIMIT 1
                """, Integer.class);
        assertThat(nonUnique).isZero();
    }

    private void assertIndexColumns(String indexName, String... expectedColumns) {
        List<String> actualColumns = jdbcTemplate.queryForList("""
                SELECT column_name
                FROM information_schema.statistics
                WHERE table_schema = DATABASE()
                  AND table_name = 'records'
                  AND index_name = ?
                ORDER BY seq_in_index
                """, String.class, indexName);

        assertThat(actualColumns).containsExactly(expectedColumns);
    }

    @Test
    @DisplayName("submission ID unique 제약은 사용자 범위이고 legacy NULL은 여러 건 허용한다")
    void should_enforce_submission_id_uniqueness_per_user_and_allow_legacy_nulls() {
        insertRecord(101L, 1L, SUBMISSION_ID);

        assertThatThrownBy(() -> insertRecord(102L, 1L, SUBMISSION_ID))
                .isInstanceOf(DataIntegrityViolationException.class);

        insertRecord(103L, 2L, SUBMISSION_ID);
        insertRecord(104L, 1L, null);
        insertRecord(105L, 1L, null);

        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM records WHERE id IN (101, 103, 104, 105)",
                Integer.class
        );
        assertThat(count).isEqualTo(4);
    }

    @Test
    @DisplayName("V3 non-null provenance와 submission fields를 new application mapping으로 읽는다")
    void should_read_record_foundation_values_with_new_application_mapping() {
        String submissionId = "4a7c1dc1-715a-4ab0-bf0a-1f8c6cf63a91";
        insertRecord(110L, 2L, submissionId);

        var record = recordRepository.findById(110L).orElseThrow();

        assertThat(record.getInputMethod()).isEqualTo(InputMethod.KEYBOARD);
        assertThat(record.getClientSubmissionId()).isEqualTo(submissionId);
        assertThat(record.getClientSubmissionPayloadHash()).hasSize(32);
    }

    private void assertColumn(String columnName, String dataType, Long maximumLength, String nullable) {
        var column = jdbcTemplate.queryForMap("""
                SELECT data_type, character_maximum_length, is_nullable
                FROM information_schema.columns
                WHERE table_schema = DATABASE()
                  AND table_name = 'records'
                  AND column_name = ?
                """, columnName);

        assertThat(column.get("data_type")).isEqualTo(dataType);
        assertThat(((Number) column.get("character_maximum_length")).longValue()).isEqualTo(maximumLength);
        assertThat(column.get("is_nullable")).isEqualTo(nullable);
    }

    private void insertRecord(Long id, Long userId, String submissionId) {
        jdbcTemplate.update("""
                INSERT INTO records (
                    id, user_id, event_type, time_ms, penalty, scramble,
                    input_method, client_submission_id, client_submission_payload_hash,
                    created_at, updated_at
                ) VALUES (?, ?, 'WCA_333', 15000, 'NONE', 'migration test scramble',
                    'KEYBOARD', ?, UNHEX(REPEAT('01', 32)), NOW(6), NOW(6))
                """, id, userId, submissionId);
    }

    static final class MigrationInitializer
            implements ApplicationContextInitializer<ConfigurableApplicationContext> {

        private static final MySQLContainer<?> MYSQL = new MySQLContainer<>(
                DockerImageName.parse("mysql:8.4.11")
        ).withCommand(
                "--character-set-server=utf8mb4",
                "--collation-server=utf8mb4_0900_ai_ci"
        );
        private static final AtomicBoolean MIGRATED = new AtomicBoolean();

        @Override
        public void initialize(ConfigurableApplicationContext context) {
            migrateOnce();
            TestPropertyValues.of(
                    "spring.datasource.url=" + MYSQL.getJdbcUrl(),
                    "spring.datasource.username=" + MYSQL.getUsername(),
                    "spring.datasource.password=" + MYSQL.getPassword(),
                    "spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver",
                    "spring.jpa.hibernate.ddl-auto=validate",
                    "spring.flyway.enabled=false",
                    "ranking.redis.rebuild-mode=disabled"
            ).applyTo(context);
        }

        private static synchronized void migrateOnce() {
            if (MIGRATED.get()) {
                return;
            }

            MYSQL.start();
            Flyway.configure()
                    .dataSource(MYSQL.getJdbcUrl(), MYSQL.getUsername(), MYSQL.getPassword())
                    .target("2")
                    .load()
                    .migrate();

            JdbcTemplate legacyDatabase = new JdbcTemplate(new DriverManagerDataSource(
                    MYSQL.getJdbcUrl(),
                    MYSQL.getUsername(),
                    MYSQL.getPassword()
            ));
            insertLegacyFixture(legacyDatabase);

            Flyway.configure()
                    .dataSource(MYSQL.getJdbcUrl(), MYSQL.getUsername(), MYSQL.getPassword())
                    .load()
                    .migrate();
            MIGRATED.set(true);
        }

        private static void insertLegacyFixture(JdbcTemplate database) {
            database.update("""
                    INSERT INTO users (
                        id, email, password, nickname, role, status, main_event, created_at, updated_at
                    ) VALUES
                        (1, 'legacy@cubinghub.com', 'password', 'Legacy', 'ROLE_USER', 'ACTIVE',
                         'WCA_333', NOW(6), NOW(6)),
                        (2, 'other@cubinghub.com', 'password', 'Other', 'ROLE_USER', 'ACTIVE',
                         'WCA_333', NOW(6), NOW(6))
                    """);
            database.update("""
                    INSERT INTO records (
                        id, user_id, event_type, time_ms, penalty, scramble, created_at, updated_at
                    ) VALUES
                        (100, 1, 'WCA_333', 12345, 'NONE', 'legacy scramble', NOW(6), NOW(6))
                    """);
            database.update("""
                    INSERT INTO user_pbs (
                        id, user_id, event_type, best_time_ms, record_id, created_at, updated_at
                    ) VALUES
                        (200, 1, 'WCA_333', 12345, 100, NOW(6), NOW(6))
                    """);
        }
    }
}
