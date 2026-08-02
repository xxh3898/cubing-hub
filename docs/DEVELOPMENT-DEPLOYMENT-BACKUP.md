# 개발·배포·백업 운영 플레이북

## 1. 문서의 역할

이 문서는 큐빙허브의 개발, GitHub Actions 검증, Mac mini 자동 배포,
Flyway migration, local snapshot, age/iCloud 복사와 복구 흐름을 한 번에
설명하는 상위 안내서다. 명령의 세부 구현은 아래 source of truth를 따른다.

- CI 분기: `.github/workflows/validate.yml`, `scripts/classify-ci-paths.sh`
- release: `.github/workflows/deploy.yml`
- 운영 구성: `homeserver/docker-compose.yml`
- 배포 worker: `homeserver/scripts/deploy-home-server.sh`
- 백업 worker: `homeserver/scripts/backup-home-server.sh`
- 고정 진입점: `homeserver/scripts/*-bootstrap.sh`, `*-ci.sh`
- 백업·복구 상세: `homeserver/docs/db-backup-restore.md`

저장소 파일을 병합하는 것만으로 LaunchAgent, heartbeat URL, age recipient가
Mac mini에 설치되지는 않는다. GitHub 변수·secret과 `/Users/homeserver/Server`
변경도 각각 별도 운영 작업이다.

## 2. 변하지 않는 원칙

1. 큐빙허브는 다른 프로젝트의 저장소, DB, volume, network, backup 또는
   credential에 의존하지 않는다.
2. API와 Web은 항상 같은 40자리 commit SHA의 image pair로 배포한다.
3. `main` 병합은 release 의사 표시이며, 검증 성공과 kill switch 활성 상태에서
   즉시 자동 배포한다.
4. DB schema source of truth는 append-only Flyway versioned migration이다.
5. local 정상 snapshot을 먼저 확정하고, raw data가 아닌 age ciphertext만
   iCloud Drive에 전달한다.
6. DB migration, image rollback, DB restore는 서로 다른 상태 전이다.
7. backup 삭제, 운영 restore, deploy·restart와 GitHub 설정 변경은 각각 별도
   승인을 요구한다.

## 3. 개발과 branch 흐름

```text
feature branch
  -> local focused test
  -> dev 또는 main 대상 PR
  -> stable required check 5개
  -> review와 unresolved finding 판정
  -> main 병합
  -> release 전체 검증
  -> exact SHA image publish
  -> Mac mini 자동 배포
```

- 운영 코드나 설정을 `main`에서 직접 수정하지 않는다.
- path-aware CI는 관련 component만 무거운 검증을 실행한다.
- 관련 없는 required job도 사라지지 않고 명시적 safe-skip 성공으로 남는다.
- 분류할 수 없는 runtime path, classifier, workflow, `.gitattributes` 변경은
  안전하게 전체 검증으로 fallback한다.
- reusable validation이 `refs/heads/main`에서 호출되면 path 결과와 무관하게
  전체 검증한다. 따라서 release가 요구하는 backend JAR과 두 image 입력이
  항상 준비된다.

Required job과 분류 결과는 다음과 같다.

| 변경 범위 | 실제 무거운 검증 | safe-skip |
| --- | --- | --- |
| frontend source | Frontend checks, Web ARM64 image | Infrastructure, Backend, API image |
| backend source | Backend checks, API ARM64 image | Infrastructure, Frontend, Web image |
| infrastructure | Infrastructure checks | Backend, Frontend, API/Web image |
| 미분류·workflow·classifier | 5개 전체 | 없음 |

## 4. main release와 배포 상태 전이

`deploy.yml`의 workflow 이름은 `Publish and Deploy`다. 정상 운영에서는
repository variable `MAC_MINI_DEPLOY_ENABLED=true`가 필요하다. 이 값이 없거나
`true`가 아니면 validation은 실행되지만 publish와 deploy는 건너뛴다.

```text
release validation
  -> API/Web ARM64 exact SHA publish
  -> runtime-config 변경 여부 판정과 exact digest publish
  -> Tailscale OIDC 연결
  -> 제한 SSH wrapper
  -> current runtime/config 검증
  -> predeploy local snapshot
  -> pending 기록
  -> candidate image의 one-shot Flyway
  -> API/Web same-SHA cutover
  -> Compose health
  -> public Web/deep link/API/asset smoke
  -> state/current 확정
```

Public smoke 대상은 Web `/`, deep link `/rankings`, API health, 대표 rankings
read endpoint와 현재 HTML이 가리키는 `/assets/*.js`다. 모든 요청은 짧은
timeout과 retry를 사용한다. public smoke 전에는 새 state를 성공으로 쓰지
않는다.

## 5. Flyway migration 계약

- 일반 API container는 `SPRING_FLYWAY_ENABLED=false`로 시작한다.
- 배포 worker는 exact candidate API image에서
  `com.cubinghub.ops.MigrationMain`만 one-shot으로 실행한다.
- one-shot subprocess에 candidate API/Web image pair를 함께 주입하고
  `--pull never`로 이미 revision label을 검증한 local image만 사용한다. 이
  임시 값은 Compose interpolation에만 적용하며 production `.env`는 migration
  성공 전까지 현재 image pair를 유지한다.
- runner는 application service나 `ApplicationRunner`를 시작하지 않고 Flyway
  migration과 Flyway validate만 수행한다.
- candidate API startup은 `ddl-auto=validate`로 JPA mapping과 실제 schema를
  검증한다. 이 검증 또는 readiness가 실패하면 이전 image pair로 돌아간다.
- migration 실패 시 `.env`와 실행 중 API/Web을 바꾸지 않고 `pending`을 남겨
  명시적 recovery가 가능하게 한다.
- 이미 성공한 DB migration은 image rollback이 자동으로 되돌리지 않는다.
- `DROP`, `TRUNCATE`, 호환되지 않는 rename/type 변경은 일반 main 자동
  release에 넣지 않는다. expand/contract와 별도 DB 작업으로 분리한다.

## 6. local snapshot 계약

Backup worker는 `--trigger scheduled`와 `--trigger predeploy`만 허용한다.
둘은 같은 snapshot 형식을 쓰며 predeploy만 offsite 실패를 배포 차단으로
승격하지 않는다. local snapshot 실패는 배포 hard gate다.

```text
cubing-hub-production-<UTC timestamp>/
├── SUCCESS
├── manifest.json
├── database/
│   ├── dump
│   ├── record-counts.tsv
│   └── version.txt
└── files/
    ├── database-references.txt
    ├── sha256.txt
    ├── stats.json
    └── post-images/
```

생성 순서:

1. verified runtime release와 production `db` 확인
2. 게시글 이미지 1차 `rsync` (`--delete` 없음)
3. MySQL `--single-transaction --complete-insert --skip-extended-insert` dump와
   구조·완료 marker 검증
4. 게시글 이미지 2차 `rsync` (`--delete` 없음)
5. 제한된 single-row INSERT grammar를 streaming 해석해 dump와 같은 snapshot의
   table별 row count와 `post_attachments.object_key` reference manifest 생성
6. 모든 dump reference가 image copy에 존재하는지 확인하고 파일별 SHA-256,
   count, bytes 기록
7. DB engine/version, row-count/reference source·hash, application SHA와 runtime
   digest 기록
8. `manifest.json` 생성
9. `SUCCESS` 마지막 생성
10. 같은 filesystem 안에서 최종 directory로 atomic rename

Image는 DB commit 전에 새 object로 저장되고 삭제는 DB commit 뒤 실행되는
immutable object다. 따라서 두 번의 `rsync`가 dump 시점 전후의 extra file을
포함할 수는 있지만, restore에 필요한 dump reference의 superset이어야 한다.
Dump가 참조하는 파일이 하나라도 없거나 예상 밖 SQL grammar·unsafe key가 나오면
live DB를 다시 조회해 추정하지 않고 snapshot 전체를 실패시킨다.

Redis는 snapshot에 포함하지 않는다. ranking은 MySQL에서 재구축하며 refresh
token, blacklist와 임시 인증 상태는 복구하지 않는다는 사실을 manifest에
기록한다. manifest에는 password, token, DB URL, email을 넣지 않는다.

## 7. schedule과 retention

LaunchAgent template은
`homeserver/launchd/com.homeserver.cubing-hub-backup.plist.example`이다.
KST 기준 `00:05`, `06:05`, `12:05`, `18:05`에 고정 bootstrap을 호출한다.
`KeepAlive`는 사용하지 않는다. deploy와 backup은 같은 project operation
lock을 사용하므로 동시에 data를 읽거나 Compose를 바꾸지 않는다.

현재 retention은 삭제가 아닌 dry-run plan만 만든다.

- recent: 최신 정상 snapshot 4개
- daily: 지난 7 calendar day마다 06:00 이후 첫 정상 snapshot 1개
- recent/daily 중복 제거
- `SUCCESS`, manifest, dump/file/reference checksum과 모든 dump reference를
  다시 통과한 snapshot만 정상본
- symlink, 예상 밖 이름, 불완전 snapshot은 삭제 후보에서 제외
- 이름이 일치하는 개별 snapshot의 metadata·dump·file·reference를 권한 문제나
  동시 disappearance로 읽지 못하면 `invalidIgnored`에만 기록하고 `keep`과
  `pruneCandidates`에서 제외하며 원본을 수정하거나 삭제하지 않음
- 결과: `<backup-root>/retention-plan.json`

Backup root 열거와 `retention-plan.json` 임시 파일 생성·flush·원자 교체 실패는
개별 snapshot 오류가 아니므로 worker 전체를 실패시킨다.

최초 7일 관찰, remote decrypt/restore drill과 별도 backup 삭제 승인 전에는
`pruneCandidates`를 실제 삭제하지 않는다.

Cubing Hub에는 이전 `com.cubinghub.backup` LaunchAgent 이력이 있으므로 새
`com.homeserver.cubing-hub.backup` schedule을 설치하기 전에 old service bootout과
old active plist의 recoverable 격리가 필요하다. Guess Pokémon에는 같은 legacy
label 이력이 없으므로 이 전환 절차를 복제하지 않는다. Exact 절차는
`homeserver/docs/db-backup-restore.md`를 따른다.

## 8. age·iCloud와 heartbeat

- public recipient: 운영 app directory의 mode `0600`
  `backup-age-recipient-v1.txt`
- private identity: MacBook local login Keychain만 사용
- local ciphertext staging: `/Users/homeserver/Server/backups/cubing-hub/offsite/`
- iCloud final:
  `~/Library/Mobile Documents/com~apple~CloudDocs/HomeServerBackups/cubing-hub/`

Snapshot directory를 tar stream으로 만들고 recipient file로 age 암호화한다.
Ciphertext header와 SHA-256을 확인한 뒤 iCloud의 `.partial` 파일로 복사하고,
hash가 같은 상태에서 final `.tar.age` rename 명령이 성공해야 한다. Rename 뒤
final 경로가 symlink가 아닌 regular file이고 SHA-256이 local ciphertext와 다시
일치할 때만 handoff 성공으로 기록한다. 그 전에 실패하면 local ciphertext를
보존하고 iCloud-stage heartbeat를 보내지 않는다. 검증된 final을 만든 뒤 local
ciphertext 정리만 실패하면 handoff는 성공으로 유지하되 경고를 남긴다. iCloud에는
raw dump나 raw image가 들어가지 않으며, iCloud local folder handoff 성공은 Apple
server의 remote upload 완료와 같은 뜻이 아니다.

선택적 heartbeat 설정은 app directory의 mode `0600`
`backup-heartbeats.conf`다. 정확히 아래 두 key만 허용하며 실제 URL은 Git,
문서, 로그에 기록하지 않는다.

```text
LOCAL_HEARTBEAT_URL=<Uptime Kuma push URL>
ICLOUD_STAGE_HEARTBEAT_URL=<Uptime Kuma push URL>
```

Local heartbeat는 snapshot publish 뒤, iCloud-stage heartbeat는 ciphertext
handoff 뒤에만 보낸다. 전송 실패는 URL을 숨긴 generic 경고만 남기며 다음
heartbeat 부재가 monitor 상태를 내리게 한다. 운영 monitor 기준은 local
7시간, iCloud-stage 8시간 grace이며 hook 설치 전에는 pause 상태를 유지한다.

## 9. 복구 원칙

1. trusted MacBook에서 iCloud ciphertext를 materialize한다.
2. ciphertext SHA-256과 age header를 확인한다.
3. Keychain identity를 stdout/file에 노출하지 않고 pipe로 age에 전달한다.
4. 격리된 Mac mini 개발용 MySQL과 별도 image directory에만 복구한다.
5. manifest, dump hash, row count, Flyway history, FK, charset/collation,
   post-image reference와 대표 read-only API를 검증한다.
6. elapsed time과 결과를 기록한다.
7. 운영 restore가 필요하면 source/target, write freeze, 최신 정상본, 중단,
   rollback을 다시 보고하고 별도 승인을 받는다.

## 10. 실패와 rollback 표

| 실패 지점 | 자동 동작 | DB 상태 |
| --- | --- | --- |
| release validation | publish/deploy 없음 | 불변 |
| local snapshot | cutover 없음 | 불변 |
| one-shot migration | 기존 app 유지, pending 보존 | 일부 적용 가능성 조사 |
| candidate health/JPA validate | 이전 image/config 재적용 | migration 유지 |
| public smoke | 이전 image/config 재적용 후 public smoke 재확인 | migration 유지 |
| iCloud handoff | scheduled 실패 또는 predeploy generic 경고, iCloud heartbeat 생략 | local snapshot과 local ciphertext 유지 |
| heartbeat 전송 | generic 경고, 다음 monitor timeout 관찰 | snapshot 유지 |

`docker compose down -v`, broad cleanup, 자동 reverse migration과 자동 운영
restore는 rollback 수단이 아니다.

## 11. 새 프로젝트 추가 체크리스트

새 프로젝트는 이 계약을 복사하되 실행 코드, DB와 credential은 독립적으로
구현한다.

- [ ] project slug, Compose project name, API/Web image repository 확정
- [ ] `dev`/PR/main branch와 stable required job 5개 확정
- [ ] path classifier의 component·unknown fallback test 추가
- [ ] main full validation과 exact SHA publish dependency 추가
- [ ] kill switch, concurrency group, GitHub Environment, Tailscale wrapper 확정
- [ ] DB engine별 logical dump·validator·row-count adapter 구현
- [ ] file data 포함 여부와 checksum/reference adapter 구현
- [ ] snapshot schema v1, `SUCCESS` last, atomic publish test 추가
- [ ] recent 4 + daily 7 dry-run retention table test 추가
- [ ] isolated one-shot Flyway와 API startup schema validate 추가
- [ ] project별 public Web/deep/API/asset smoke 정의
- [ ] age recipient, iCloud project directory, heartbeat config 경로 분리
- [ ] 6시간 stagger schedule과 project lock 추가
- [ ] 격리 restore drill, RTO 측정과 운영 restore 승인 절차 작성
- [ ] Server 설치, GitHub 설정, monitor activation을 repository merge와 분리

## 12. 운영 전 최종 확인

- repository focused test와 hosted required check 성공
- `MAC_MINI_DEPLOY_ENABLED=true` readback
- current/previous exact SHA와 runtime config digest 확인
- 최신 정상 local snapshot과 remote decrypt 가능성 확인
- migration 종류가 additive/backward-compatible인지 확인
- public smoke와 rollback image의 local availability 확인
- operation lock과 `pending` 부재 확인
- merge가 즉시 production deploy를 시작한다는 최종 승인
