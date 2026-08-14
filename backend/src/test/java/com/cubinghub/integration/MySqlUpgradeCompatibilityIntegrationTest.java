package com.cubinghub.integration;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.utility.DockerImageName;
import org.testcontainers.utility.MountableFile;

@DisplayName("MySQL 8.4 logical upgrade 호환성 통합 테스트")
class MySqlUpgradeCompatibilityIntegrationTest {

    private static final String SOURCE_IMAGE = "mysql:8.0.46";
    private static final String TARGET_IMAGE = "mysql:8.4.11";
    private static final String DATABASE_NAME = "cubing_hub";
    private static final String DATABASE_USER = "cubing_hub";
    private static final String DATABASE_PASSWORD = "upgrade-fixture-password";

    @TempDir
    Path temporaryDirectory;

    @Test
    @DisplayName("8.0 logical backup은 fresh 8.4.11과 fresh 8.0.46에 동일하게 복구된다")
    void should_restore_mysql_8_0_backup_to_8_4_and_fresh_8_0_with_data_parity() throws Exception {
        Path dumpFile = temporaryDirectory.resolve("pre-upgrade.sql");
        DatabaseSnapshot sourceSnapshot;

        try (MySQLContainer<?> source = mysql(SOURCE_IMAGE)) {
            source.start();
            migrate(source);
            JdbcTemplate sourceDatabase = database(source);
            seed(sourceDatabase);
            sourceSnapshot = snapshot(sourceDatabase);

            assertThat(sourceDatabase.queryForObject("SELECT VERSION()", String.class))
                    .isEqualTo("8.0.46");

            var dump = source.execInContainer(
                    "/bin/sh",
                    "-ceu",
                    """
                    export MYSQL_PWD="$MYSQL_ROOT_PASSWORD"
                    exec mysqldump \
                      --user=root \
                      --default-character-set=utf8mb4 \
                      --single-transaction \
                      --quick \
                      --complete-insert \
                      --skip-extended-insert \
                      --hex-blob \
                      --routines \
                      --triggers \
                      "$MYSQL_DATABASE"
                    """
            );

            assertThat(dump.getExitCode()).isZero();
            assertThat(dump.getStdout())
                    .contains("CREATE TABLE `records`")
                    .contains("CREATE TABLE `flyway_schema_history`")
                    .contains("-- Dump completed on");
            Files.writeString(dumpFile, dump.getStdout(), StandardCharsets.UTF_8);
        }

        assertRestoredSnapshot(TARGET_IMAGE, "8.4.11", dumpFile, sourceSnapshot);
        assertRestoredSnapshot(SOURCE_IMAGE, "8.0.46", dumpFile, sourceSnapshot);
    }

    private void assertRestoredSnapshot(
            String image,
            String expectedVersion,
            Path dumpFile,
            DatabaseSnapshot expected
    ) throws Exception {
        try (MySQLContainer<?> target = mysql(image)) {
            target.start();
            target.copyFileToContainer(MountableFile.forHostPath(dumpFile), "/tmp/pre-upgrade.sql");

            var restore = target.execInContainer(
                    "/bin/sh",
                    "-ceu",
                    """
                    export MYSQL_PWD="$MYSQL_ROOT_PASSWORD"
                    exec mysql --user=root "$MYSQL_DATABASE" < /tmp/pre-upgrade.sql
                    """
            );

            assertThat(restore.getExitCode()).isZero();
            JdbcTemplate restoredDatabase = database(target);
            assertThat(restoredDatabase.queryForObject("SELECT VERSION()", String.class))
                    .isEqualTo(expectedVersion);
            assertThat(snapshot(restoredDatabase)).isEqualTo(expected);
        }
    }

    private MySQLContainer<?> mysql(String image) {
        return new MySQLContainer<>(DockerImageName.parse(image))
                .withDatabaseName(DATABASE_NAME)
                .withUsername(DATABASE_USER)
                .withPassword(DATABASE_PASSWORD)
                .withCommand(
                        "--character-set-server=utf8mb4",
                        "--collation-server=utf8mb4_0900_ai_ci"
                );
    }

    private void migrate(MySQLContainer<?> source) {
        Flyway.configure()
                .dataSource(source.getJdbcUrl(), source.getUsername(), source.getPassword())
                .locations("classpath:db/migration")
                .load()
                .migrate();
    }

    private JdbcTemplate database(MySQLContainer<?> container) {
        return new JdbcTemplate(new DriverManagerDataSource(
                container.getJdbcUrl(),
                container.getUsername(),
                container.getPassword()
        ));
    }

    private void seed(JdbcTemplate database) {
        database.update("""
                INSERT INTO users (
                    id, created_at, updated_at, main_event, nickname, email,
                    password, role, status
                ) VALUES (
                    1, '2026-08-01 00:00:00.000000', '2026-08-01 00:00:00.000000',
                    'WCA_333', 'UpgradeFixture', 'upgrade-fixture@cubinghub.com',
                    'fixture-password-hash', 'ROLE_USER', 'ACTIVE'
                )
                """);
        database.update("""
                INSERT INTO records (
                    id, time_ms, created_at, updated_at, user_id, scramble,
                    event_type, penalty, input_method, client_submission_id,
                    client_submission_payload_hash
                ) VALUES
                    (1, 12000, '2026-08-01 01:00:00.000001', '2026-08-01 01:00:00.000001',
                     1, 'fixture-none', 'WCA_333', 'NONE', 'KEYBOARD',
                     '11111111-1111-4111-8111-111111111111', UNHEX(REPEAT('11', 32))),
                    (2, 11000, '2026-08-01 02:00:00.000002', '2026-08-01 02:00:00.000002',
                     1, 'fixture-plus-two', 'WCA_333', 'PLUS_TWO', 'TOUCH',
                     '22222222-2222-4222-8222-222222222222', UNHEX(REPEAT('22', 32))),
                    (3, 10000, '2026-08-01 03:00:00.000003', '2026-08-01 03:00:00.000003',
                     1, 'fixture-dnf', 'WCA_333', 'DNF', 'KEYBOARD',
                     '33333333-3333-4333-8333-333333333333', UNHEX(REPEAT('33', 32)))
                """);
        database.update("""
                INSERT INTO user_pbs (
                    id, best_time_ms, created_at, updated_at, record_id, user_id, event_type
                ) VALUES (
                    1, 12000, '2026-08-01 01:00:00.000001', '2026-08-01 01:00:00.000001',
                    1, 1, 'WCA_333'
                )
                """);
        database.update("""
                INSERT INTO posts (
                    id, view_count, created_at, updated_at, user_id, title, content, category
                ) VALUES (
                    1, 3, '2026-08-01 04:00:00.000004', '2026-08-01 04:00:00.000004',
                    1, 'Upgrade fixture post', 'Upgrade fixture content', 'FREE'
                )
                """);
        database.update("""
                INSERT INTO comments (
                    id, created_at, updated_at, post_id, user_id, content
                ) VALUES (
                    1, '2026-08-01 05:00:00.000005', '2026-08-01 05:00:00.000005',
                    1, 1, 'Upgrade fixture comment'
                )
                """);
    }

    private DatabaseSnapshot snapshot(JdbcTemplate database) {
        int tableCount = requiredInteger(database, """
                SELECT COUNT(*)
                FROM information_schema.tables
                WHERE table_schema = DATABASE()
                  AND table_type = 'BASE TABLE'
                """);
        Map<String, Integer> rowCounts = Map.of(
                "users", requiredInteger(database, "SELECT COUNT(*) FROM users"),
                "records", requiredInteger(database, "SELECT COUNT(*) FROM records"),
                "user_pbs", requiredInteger(database, "SELECT COUNT(*) FROM user_pbs"),
                "posts", requiredInteger(database, "SELECT COUNT(*) FROM posts"),
                "comments", requiredInteger(database, "SELECT COUNT(*) FROM comments"),
                "flyway", requiredInteger(
                        database,
                        "SELECT COUNT(*) FROM flyway_schema_history WHERE success = 1"
                )
        );
        List<String> penaltyDistribution = database.queryForList("""
                SELECT CONCAT(penalty, ':', COUNT(*))
                FROM records
                GROUP BY penalty
                ORDER BY penalty
                """, String.class);
        List<String> eventDistribution = database.queryForList("""
                SELECT CONCAT(event_type, ':', COUNT(*))
                FROM records
                GROUP BY event_type
                ORDER BY event_type
                """, String.class);
        List<String> personalBests = database.queryForList("""
                SELECT CONCAT(user_id, ':', event_type, ':', best_time_ms, ':', record_id)
                FROM user_pbs
                ORDER BY user_id, event_type
                """, String.class);
        List<String> indexes = database.queryForList("""
                SELECT CONCAT(table_name, ':', index_name, ':', seq_in_index, ':', column_name, ':', non_unique)
                FROM information_schema.statistics
                WHERE table_schema = DATABASE()
                ORDER BY table_name, index_name, seq_in_index
                """, String.class);
        List<String> foreignKeys = database.queryForList("""
                SELECT CONCAT(table_name, ':', constraint_name, ':', column_name, ':',
                              referenced_table_name, ':', referenced_column_name)
                FROM information_schema.key_column_usage
                WHERE table_schema = DATABASE()
                  AND referenced_table_name IS NOT NULL
                ORDER BY table_name, constraint_name, ordinal_position
                """, String.class);
        Map<String, Object> recordRange = database.queryForMap("""
                SELECT MIN(id) AS min_id, MAX(id) AS max_id,
                       MIN(created_at) AS first_created_at,
                       MAX(created_at) AS latest_created_at
                FROM records
                """);

        return new DatabaseSnapshot(
                tableCount,
                rowCounts,
                penaltyDistribution,
                eventDistribution,
                personalBests,
                indexes,
                foreignKeys,
                String.valueOf(recordRange.get("min_id")),
                String.valueOf(recordRange.get("max_id")),
                String.valueOf(recordRange.get("first_created_at")),
                String.valueOf(recordRange.get("latest_created_at"))
        );
    }

    private int requiredInteger(JdbcTemplate database, String sql) {
        Integer value = database.queryForObject(sql, Integer.class);
        assertThat(value).isNotNull();
        return value;
    }

    private record DatabaseSnapshot(
            int tableCount,
            Map<String, Integer> rowCounts,
            List<String> penaltyDistribution,
            List<String> eventDistribution,
            List<String> personalBests,
            List<String> indexes,
            List<String> foreignKeys,
            String minimumRecordId,
            String maximumRecordId,
            String firstRecordCreatedAt,
            String latestRecordCreatedAt
    ) {
    }
}
