SET @benchmark_user_count = IFNULL(@benchmark_user_count, 10);
SET @records_per_user = IFNULL(@records_per_user, 10000);
SET @benchmark_password_hash = IFNULL(@benchmark_password_hash, '$2y$05$71EoNsrBEXt87q74wMUTKeNOZCHOfs.YZIgd4SjmmnYaW0R0uvKu6');
SET @base_created_at = IFNULL(@base_created_at, '2026-04-22 09:00:00');

SET SESSION cte_max_recursion_depth = GREATEST(@benchmark_user_count, @records_per_user);

DROP TEMPORARY TABLE IF EXISTS benchmark_user_numbers;
CREATE TEMPORARY TABLE benchmark_user_numbers (
    seq INT NOT NULL PRIMARY KEY
) ENGINE=InnoDB;

INSERT INTO benchmark_user_numbers (seq)
WITH RECURSIVE sequence AS (
    SELECT 1 AS seq
    UNION ALL
    SELECT seq + 1
    FROM sequence
    WHERE seq < @benchmark_user_count
)
SELECT seq
FROM sequence;

INSERT INTO users (
    email,
    password,
    nickname,
    role,
    status,
    main_event,
    created_at,
    updated_at
)
SELECT
    CONCAT('mypage-benchmark-user', seq, '@test.com'),
    @benchmark_password_hash,
    CONCAT('MyPageBenchmarkUser', seq),
    'ROLE_USER',
    'ACTIVE',
    '3x3x3',
    TIMESTAMP(@base_created_at) + INTERVAL seq SECOND,
    TIMESTAMP(@base_created_at) + INTERVAL seq SECOND
FROM benchmark_user_numbers;

DROP TEMPORARY TABLE IF EXISTS benchmark_users;
CREATE TEMPORARY TABLE benchmark_users (
    seq INT NOT NULL PRIMARY KEY,
    user_id BIGINT NOT NULL
) ENGINE=InnoDB;

INSERT INTO benchmark_users (seq, user_id)
SELECT
    benchmark_user_numbers.seq,
    users.id
FROM benchmark_user_numbers
JOIN users
    ON users.email = CONCAT('mypage-benchmark-user', benchmark_user_numbers.seq, '@test.com');

DROP TEMPORARY TABLE IF EXISTS benchmark_record_numbers;
CREATE TEMPORARY TABLE benchmark_record_numbers (
    seq INT NOT NULL PRIMARY KEY
) ENGINE=InnoDB;

INSERT INTO benchmark_record_numbers (seq)
WITH RECURSIVE sequence AS (
    SELECT 1 AS seq
    UNION ALL
    SELECT seq + 1
    FROM sequence
    WHERE seq < @records_per_user
)
SELECT seq
FROM sequence;

INSERT INTO records (
    user_id,
    event_type,
    time_ms,
    penalty,
    scramble,
    created_at,
    updated_at
)
SELECT
    benchmark_users.user_id,
    'WCA_333',
    6000 + MOD((benchmark_users.seq * 100003) + (benchmark_record_numbers.seq * 37), 24000),
    CASE
        WHEN MOD(benchmark_record_numbers.seq, 20) = 0 THEN 'DNF'
        WHEN MOD(benchmark_record_numbers.seq, 5) = 0 THEN 'PLUS_TWO'
        ELSE 'NONE'
    END,
    CONCAT('mypage-benchmark-', benchmark_users.seq, '-', benchmark_record_numbers.seq),
    TIMESTAMP(@base_created_at)
        + INTERVAL (((benchmark_users.seq - 1) * @records_per_user) + benchmark_record_numbers.seq) SECOND,
    TIMESTAMP(@base_created_at)
        + INTERVAL (((benchmark_users.seq - 1) * @records_per_user) + benchmark_record_numbers.seq) SECOND
FROM benchmark_users
CROSS JOIN benchmark_record_numbers;

ANALYZE TABLE users, records;
