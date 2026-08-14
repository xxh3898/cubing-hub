---
doc_type: quality
status: active
created: 2026-08-12
updated: 2026-08-12
owner: xxh3898
project: cubing-hub
tags: []
related:
  - docs/06-quality/quality-gates.md
  - docs/06-quality/performance/growth-read-api-10k-mysql-8-4.md
  - docs/07-operations/environments.md
  - homeserver/docs/db-backup-restore.md
  - backend/src/test/java/com/cubinghub/integration/MySqlUpgradeCompatibilityIntegrationTest.java
  - backend/src/test/java/com/cubinghub/integration/MySqlVersionIntegrationTest.java
---
# MySQL 8.4 Upgrade Evidence

## Version과 path

- source: MySQL 8.0.46
- target: [MySQL 8.4.11 LTS](https://dev.mysql.com/doc/relnotes/mysql/8.4/en/news-8-4-11.html), exact Docker tag `mysql:8.4.11`
- image manifest: `sha256:b3b90af2a6552ae30c266fdb7d5dd55f3afb72404bb78d37fe8a23eb857fd3fb`, linux/amd64와 linux/arm64 제공
- upgrade path: MySQL 8.0에서 다음 LTS인 8.4로 upgrade 가능
- rollback path: pre-upgrade logical backup을 fresh MySQL 8.0.46에 restore

MySQL 8.4가 upgrade한 data directory를 MySQL 8.0 image로 다시 시작하지 않는다. MySQL의 [upgrade prerequisite](https://dev.mysql.com/doc/refman/8.4/en/upgrade-prerequisites.html), [8.4 changes](https://dev.mysql.com/doc/refman/8.4/en/upgrading-from-previous-series.html), [downgrade path](https://dev.mysql.com/doc/refman/8.4/en/downgrading.html)를 production gate로 사용한다.

## Compatibility check

격리된 MySQL 8.0.46 fixture에 existing Flyway V1~V3와 synthetic application data를 적용했다. MySQL Shell Upgrade Checker의 target을 8.4.11로 지정한 결과는 다음과 같다.

| Result | Count | 해석 |
| --- | ---: | --- |
| Error | 0 | upgrade를 차단하는 schema·configuration 문제 없음 |
| Warning | 24 | 8.4 server default 변경. repository가 명시적으로 설정하지 않는 InnoDB·replication 관련 default 포함 |
| Notice | 2 | synthetic root account의 `SET_USER_ID` privilege 제거 안내 |

Database base table 10개는 모두 `CHECK TABLE` status `OK`였다. Spatial index, replication configuration, obsolete SQL mode와 제거된 startup option은 repository runtime에 없다. App DB user는 8.0과 8.4에서 `caching_sha2_password`를 유지했다.

MySQL 8.4.11 release-specific 변경 가운데 Cubing Hub에 영향을 줄 수 있는 범위도 확인했다.

- InnoDB의 B-tree record size와 DDL validation 수정: existing V1~V3 fresh migration 성공
- CTE와 `LEFT JOIN` optimizer 수정: Growth trend·PB progression query plan 재측정
- replication variable deprecation: replication을 사용하지 않아 영향 없음
- Enterprise Linux 7 packaging 제거: official container의 Oracle Linux 9 계열과 무관

## Backup, restore와 first startup

Production backup worker와 같은 주요 `mysqldump` option으로 8.0 fixture를 논리 백업했다. Fresh 8.4.11과 fresh 8.0.46에 같은 dump를 restore해 다음 parity를 확인했다.

| Evidence | Source 8.0.46 | Target 8.4.11 | Rollback 8.0.46 |
| --- | ---: | ---: | ---: |
| database base table | 10 | 10 | 10 |
| successful Flyway migration | 3 | 3 | 3 |
| users / records / user_pbs | 1 / 3 / 1 | 1 / 3 / 1 | 1 / 3 / 1 |
| posts / comments | 1 / 1 | 1 / 1 | 1 / 1 |
| Penalty NONE / PLUS_TWO / DNF | 1 / 1 / 1 | 1 / 1 / 1 | 1 / 1 / 1 |
| current PB | WCA_333 / 12000ms / Record 1 | 동일 | 동일 |

Index와 FK inventory, Record min/max ID, first/latest microsecond timestamp, `records` table collation도 일치했다. Fresh 8.4.11 restore 뒤 current source로 build한 API image는 Hibernate schema validation과 health check를 통과했다.

별도 isolated volume에서 MySQL 8.0.46을 정상 종료하고 같은 data directory를 MySQL 8.4.11로 처음 시작했다. Server log는 data dictionary `80023 → 80300`과 server `80046 → 80411` upgrade 완료를 기록했고, `SELECT VERSION()`은 `8.4.11`, application data와 Flyway history는 그대로였다.

## Executable gate

- `MySqlVersionIntegrationTest`: actual engine patch와 server charset/collation
- `RecordFoundationMigrationIntegrationTest`: fresh V1~V3 migration과 table collation
- `MySqlUpgradeCompatibilityIntegrationTest`: 8.0 logical backup을 fresh 8.4와 fresh 8.0에 restore한 parity
- `GrowthQueryPlanIntegrationTest`: 10,000-record Growth query의 8.4.11 access path
- backend full test와 REST Docs: application contract regression

Production data와 volume은 이 evidence 생성에 사용하지 않았다. 실제 production upgrade는 [DB와 이미지 백업·복구](../../homeserver/docs/db-backup-restore.md)의 별도 승인과 maintenance gate를 따른다.
