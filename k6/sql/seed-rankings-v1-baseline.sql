SET SESSION cte_max_recursion_depth = 300000;

DROP TEMPORARY TABLE IF EXISTS baseline_numbers;
CREATE TEMPORARY TABLE baseline_numbers (
    seq INT NOT NULL PRIMARY KEY
) ENGINE=InnoDB;

INSERT INTO baseline_numbers (seq)
WITH RECURSIVE sequence AS (
    SELECT 1 AS seq
    UNION ALL
    SELECT seq + 1
    FROM sequence
    WHERE seq < 300000
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
    CONCAT('user', seq, '@test.com'),
    '$2y$05$71EoNsrBEXt87q74wMUTKeNOZCHOfs.YZIgd4SjmmnYaW0R0uvKu6',
    CONCAT('User', seq),
    'ROLE_USER',
    'ACTIVE',
    '3x3x3',
    TIMESTAMP('2026-04-20 09:00:00') + INTERVAL seq SECOND,
    TIMESTAMP('2026-04-20 09:00:00') + INTERVAL seq SECOND
FROM baseline_numbers;

DROP TEMPORARY TABLE IF EXISTS baseline_users;
CREATE TEMPORARY TABLE baseline_users (
    seq INT NOT NULL PRIMARY KEY,
    user_id BIGINT NOT NULL
) ENGINE=InnoDB;

INSERT INTO baseline_users (seq, user_id)
SELECT
    numbers.seq,
    users.id
FROM baseline_numbers numbers
JOIN users
    ON users.email = CONCAT('user', numbers.seq, '@test.com');

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
    baseline_users.user_id,
    'WCA_333',
    7000 + MOD(baseline_users.seq * 37, 24000),
    'NONE',
    CONCAT('baseline-scramble-', baseline_users.seq),
    TIMESTAMP('2026-04-20 10:00:00') + INTERVAL baseline_users.seq SECOND,
    TIMESTAMP('2026-04-20 10:00:00') + INTERVAL baseline_users.seq SECOND
FROM baseline_users;

DROP TEMPORARY TABLE IF EXISTS baseline_records;
CREATE TEMPORARY TABLE baseline_records (
    seq INT NOT NULL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    record_id BIGINT NOT NULL,
    time_ms INT NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL
) ENGINE=InnoDB;

INSERT INTO baseline_records (
    seq,
    user_id,
    record_id,
    time_ms,
    created_at,
    updated_at
)
SELECT
    baseline_users.seq,
    records.user_id,
    records.id,
    records.time_ms,
    records.created_at,
    records.updated_at
FROM baseline_users
JOIN records
    ON records.user_id = baseline_users.user_id
   AND records.scramble = CONCAT('baseline-scramble-', baseline_users.seq);

INSERT INTO user_pbs (
    user_id,
    event_type,
    best_time_ms,
    record_id,
    created_at,
    updated_at
)
SELECT
    baseline_records.user_id,
    'WCA_333',
    baseline_records.time_ms,
    baseline_records.record_id,
    baseline_records.created_at,
    baseline_records.updated_at
FROM baseline_records;

ANALYZE TABLE users, records, user_pbs;
