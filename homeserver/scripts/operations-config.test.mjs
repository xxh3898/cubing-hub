import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [
  compose,
  adminCompose,
  envExample,
  deployScript,
  restrictedWrapper,
  backupScript,
  backupBootstrap,
  frontendDockerfile,
  launchAgent,
  dockerIgnore,
  runtimeConfigDockerfile,
  runtimeConfigDetector,
  setupGuide,
  runbook,
] = await Promise.all([
  read("../docker-compose.yml"),
  read("../docker-compose.admin.yml"),
  read("../.env.example"),
  read("./deploy-home-server.sh"),
  read("./deploy-home-server-ci.sh"),
  read("./backup-home-server.sh"),
  read("./backup-home-server-bootstrap.sh"),
  read("../docker/frontend.Dockerfile"),
  read("../launchd/com.homeserver.cubing-hub-backup.plist.example"),
  read("../../.dockerignore"),
  read("../runtime-config.Dockerfile"),
  read("./detect-runtime-config-change.sh"),
  read("../docs/mac-mini-server-setup.md"),
  read("../docs/home-server-runbook.md"),
]);

test("should_isolateDataServicesAndGiveOnlyApiOutboundAccess_when_productionRuns", () => {
  const db = serviceBlock(compose, "db");
  const redis = serviceBlock(compose, "redis");
  const api = serviceBlock(compose, "api");
  const web = serviceBlock(compose, "web");

  for (const service of [db, redis, api, web]) {
    assert.doesNotMatch(service, /\n\s+ports:/);
  }

  assert.match(db, /\n    networks:\n      - application/);
  assert.match(redis, /\n    networks:\n      - application/);
  assert.match(
    api,
    /\n    networks:\n      - application\n      - outbound/,
  );
  assert.doesNotMatch(api, /\n      - edge/);
  assert.doesNotMatch(db, /\n      - outbound/);
  assert.doesNotMatch(redis, /\n      - outbound/);
  assert.match(
    web,
    /\n    networks:\n      application:\n      edge:\n        aliases:\n          - cubing-hub-web/,
  );
  assert.doesNotMatch(web, /\n      outbound:/);
  assert.match(
    compose,
    /application:\n    internal: true[\s\S]*outbound:\n    driver: bridge[\s\S]*edge:\n    external: true\n    name: edge/,
  );
});

test("should_useImmutableGhcrImagesAndNoSourceBuild_when_productionRuns", () => {
  assert.match(compose, /image: \$\{API_IMAGE:\?API_IMAGE must be set\}/);
  assert.match(compose, /image: \$\{WEB_IMAGE:\?WEB_IMAGE must be set\}/);
  assert.match(
    envExample,
    /API_IMAGE=ghcr\.io\/xxh3898\/cubing-hub-api:[0-9a-f]{40}/,
  );
  assert.match(
    envExample,
    /WEB_IMAGE=ghcr\.io\/xxh3898\/cubing-hub-web:[0-9a-f]{40}/,
  );
  assert.doesNotMatch(compose, /\bbuild:/);
  assert.doesNotMatch(compose, /DOCKERHUB|IMAGE_TAG|self-hosted/);
});

test("should_hardenApplicationContainersAndKeepSecretsExternal", () => {
  for (const serviceName of ["api", "web"]) {
    const service = serviceBlock(compose, serviceName);
    assert.match(service, /\n    read_only: true/);
    assert.match(service, /\n    pids_limit: [0-9]+/);
    assert.match(
      service,
      /\n    security_opt:\n      - no-new-privileges:true/,
    );
    assert.match(
      service,
      /\n    logging:\n      driver: json-file\n      options:\n        max-size: 10m\n        max-file: "3"/,
    );
  }

  assert.match(
    envExample,
    /POST_IMAGES_HOST_DIR=\/Users\/homeserver\/Server\/data\/cubing-hub\/post-images/,
  );
  assert.doesNotMatch(envExample, /ghp_|github_pat_|Bearer |BEGIN .*PRIVATE KEY/);
});

test("should_allowOnlyRestrictedDeployCommand_when_ciConnectsOverSsh", () => {
  assert.match(
    restrictedWrapper,
    /deploy-cubing-hub-v2[\s\S]*keep[\s\S]*deploy-cubing-hub-v2[\s\S]*update/,
  );
  assert.doesNotMatch(restrictedWrapper, /eval|bash -c|sh -c/);
  assert.match(
    restrictedWrapper,
    /\/Users\/homeserver\/Server\/scripts\/deploy\/deploy-cubing-hub\.sh/,
  );
});

test("should_documentPinnedSystemPython_when_operationsScriptsRequireIt", () => {
  assert.match(deployScript, /readonly PYTHON_BIN=\/usr\/bin\/python3/);
  assert.match(backupScript, /readonly PYTHON_BIN=\/usr\/bin\/python3/);
  assert.match(setupGuide, /test -x \/usr\/bin\/python3/);
  assert.match(setupGuide, /test -x \/usr\/bin\/lockf/);
  assert.match(setupGuide, /\/usr\/bin\/python3 --version/);
  assert.match(setupGuide, /Homebrew 도구나 임의[\s\S]*PATH로 대체하지/);
});

test("should_bootstrapEmptyDataServicesAndBackupOnlyBeforeUpdates", () => {
  assert.match(
    deployScript,
    /data_images=\(\)[\s\S]*while IFS= read -r data_image; do[\s\S]*data_images\+=\("\$\{data_image\}"\)[\s\S]*done < <\(compose config --images db redis\)/,
  );
  assert.doesNotMatch(deployScript, /\bmapfile\b/);
  assert.match(
    deployScript,
    /"\$\{DOCKER_BIN\}" --config "\$\{docker_config_dir\}" pull "\$\{data_image\}"/,
  );

  const infrastructurePull = deployScript.indexOf(
    '  for data_image in "${data_images[@]}"; do',
  );
  const firstDataStart = deployScript.indexOf('    db redis\n');
  const backupCondition = deployScript.indexOf(
    'if [[ -n "${previous_sha}" ]]; then\n  if [[ ! -x "${active_backup_script}"',
  );
  const imageWrite = deployScript.indexOf(
    'write_image_env "${new_api_image}" "${new_web_image}"',
  );

  assert.ok(infrastructurePull >= 0);
  assert.ok(firstDataStart > infrastructurePull);
  assert.ok(backupCondition > firstDataStart);
  assert.ok(imageWrite > backupCondition);
  assert.match(
    deployScript,
    /production db service must be running before an update/,
  );
});

test("should_rollbackBothImagesWithoutDeletingPersistentData", () => {
  assert.match(
    deployScript,
    /previous_api_image="\$\{API_IMAGE_REPOSITORY\}:\$\{previous_sha\}"/,
  );
  assert.match(
    deployScript,
    /previous_web_image="\$\{WEB_IMAGE_REPOSITORY\}:\$\{previous_sha\}"/,
  );
  assert.match(
    deployScript,
    /Database migration is not rolled back automatically/,
  );
  assert.match(
    deployScript,
    /active_compose_file="\$\{current_compose_file\}"/,
  );
  assert.match(deployScript, /RUNTIME_CONFIG_PENDING/);
  assert.match(deployScript, /Compose project name must remain cubing-hub/);
  assert.match(deployScript, /MySQL persistent volume contract is invalid/);
  assert.match(deployScript, /Redis persistent volume contract is invalid/);
  assert.match(
    deployScript,
    /write_pending_state[\s\S]*"\$\{previous_sha:-\$\{ZERO_SHA\}\}"/,
  );
  assert.doesNotMatch(
    deployScript,
    /down[^\n]*(?:--volumes|-v)|volume rm|system prune/,
  );
});

test("should_validateOnlyProtectedRuntimeInvariants_when_composeChanges", () => {
  assert.match(
    deployScript,
    /validation_baseline_compose_file="\$\{current_compose_file\}"/,
  );
  assert.match(deployScript, /--project-name "\$\{PROJECT_NAME\}"/);
  assert.match(
    deployScript,
    /current runtime config pointer does not match verified state/,
  );
  assert.match(
    deployScript,
    /image changes require a separate data-service procedure/,
  );
  assert.match(
    deployScript,
    /for field in \("command", "entrypoint"\)/,
  );
  assert.match(
    deployScript,
    /API data-sensitive environment changes require a separate migration procedure/,
  );
  assert.match(
    deployScript,
    /db MYSQL environment changes require a separate data-service procedure/,
  );
  assert.match(deployScript, /"DB_USERNAME"/);
  assert.match(deployScript, /"DB_PASSWORD"/);
  assert.match(deployScript, /"REDIS_HOST"/);
  assert.match(deployScript, /"REDIS_PORT"/);
  assert.match(deployScript, /"RANKING_REDIS_REBUILD_MODE"/);
  assert.match(deployScript, /"POST_IMAGES_"/);
  assert.match(deployScript, /"SPRING_APPLICATION_JSON"/);
  assert.match(deployScript, /"SPRING_CONFIG_"/);
  assert.match(deployScript, /"SPRING_PROFILES_"/);
  assert.match(deployScript, /"SPRING_SQL_INIT_"/);
  for (const javaOption of [
    "JAVA_TOOL_OPTIONS",
    "JDK_JAVA_OPTIONS",
    "_JAVA_OPTIONS",
    "JAVA_OPTS",
  ]) {
    assert.match(deployScript, new RegExp(`"${javaOption}"`));
  }
  assert.match(
    deployScript,
    /healthcheck test differs from the active verified configuration/,
  );
  assert.match(
    deployScript,
    /user differs from the active verified configuration/,
  );
  assert.match(
    deployScript,
    /tmpfs target set differs from the active verified configuration/,
  );
  assert.equal(deployScript.match(/--no-env-resolution/g)?.length, 1);
  assert.doesNotMatch(deployScript, /RUNTIME_CONFIG_VALIDATION_ROLE/);
  assert.doesNotMatch(deployScript, /candidate_source/);
  assert.match(
    deployScript,
    /must not mount configs, secrets, or env files/,
  );
  assert.match(deployScript, /service\.get\("extra_hosts"\)/);
  assert.match(deployScript, /service\.get\("external_links"\)/);
  assert.match(deployScript, /service\.get\("links"\)/);
  assert.match(deployScript, /must not override protected service hostnames/);
  assert.match(deployScript, /for name in \("api", "web"\)/);
  assert.match(deployScript, /for field in \("command", "entrypoint"\)/);
  assert.match(deployScript, /must not override its image/);
  assert.match(deployScript, /must not publish host ports/);
  assert.match(deployScript, /must not receive host or Docker privileges/);
  assert.match(deployScript, /must not share the host namespace/);
  assert.match(deployScript, /application network must remain project-private and internal/);
  assert.match(deployScript, /Nginx must mount the candidate release real-IP configuration/);
  assert.match(deployScript, /deployment_service_set_is_healthy/);
  assert.doesNotMatch(deployScript, /expected_full_api_environment/);
  assert.doesNotMatch(deployScript, /expected_healthchecks/);
  assert.doesNotMatch(deployScript, /expected_hardening/);
  assert.doesNotMatch(deployScript, /restart policy must remain/);
  assert.doesNotMatch(deployScript, /logging rotation contract/);
});

test("should_packageOnlyAllowlistedRuntimeConfigFiles_when_configChanges", () => {
  assert.match(
    runtimeConfigDockerfile,
    /FROM scratch[\s\S]*COPY homeserver\/docker-compose\.yml \/runtime\/compose\.yaml[\s\S]*COPY homeserver\/nginx\/cloudflare-edge-real-ip\.conf[\s\S]*COPY --chmod=0700 homeserver\/scripts\/deploy-home-server\.sh \/runtime\/scripts\/deploy-cubing-hub\.sh[\s\S]*COPY --chmod=0700 homeserver\/scripts\/backup-home-server\.sh \/runtime\/scripts\/backup-cubing-hub\.sh/,
  );
  assert.doesNotMatch(runtimeConfigDockerfile, /deploy-home-server-ci/);
  assert.match(
    runtimeConfigDetector,
    /\.dockerignore[\s\S]*homeserver\/docker-compose\.yml[\s\S]*homeserver\/nginx\/cloudflare-edge-real-ip\.conf[\s\S]*homeserver\/scripts\/backup-home-server\.sh[\s\S]*homeserver\/scripts\/deploy-home-server\.sh[\s\S]*homeserver\/runtime-config\.Dockerfile/,
  );
  assert.match(runtimeConfigDetector, /git diff --quiet/);
  assert.match(runtimeConfigDetector, /printf 'keep\\n'/);
  assert.match(runtimeConfigDetector, /printf 'update\\n'/);
  assert.doesNotMatch(
    runtimeConfigDetector,
    /deploy-home-server-ci|backup-home-server-bootstrap/,
  );
  assert.match(dockerIgnore, /^homeserver\/scripts\/\*$/m);
  assert.match(
    dockerIgnore,
    /^!homeserver\/scripts\/deploy-home-server\.sh$/m,
  );
  assert.match(
    dockerIgnore,
    /^!homeserver\/scripts\/backup-home-server\.sh$/m,
  );
});

test("should_executeOnlyVerifiedReleaseScripts_when_runtimeConfigChanges", () => {
  for (const script of [deployScript, backupScript]) {
    assert.match(
      script,
      /scripts\/backup-cubing-hub\.sh[\s\S]*scripts\/deploy-cubing-hub\.sh/,
    );
    assert.match(script, /runtime config script mode must be 700/);
    assert.match(script, /\/bin\/bash -n "\$\{script\}"/);
    assert.match(
      script,
      /runtime_config_content_sha256[\s\S]*scripts\/backup-cubing-hub\.sh[\s\S]*scripts\/deploy-cubing-hub\.sh/,
    );
  }

  assert.match(
    restrictedWrapper,
    /runtime config entry allowlist does not match/,
  );
  assert.match(
    restrictedWrapper,
    /validate_release "\$\{release_temp\}" synced[\s\S]*exec "\$\{candidate_script\}"/,
  );
  assert.match(
    deployScript,
    /active_backup_script="\$\{candidate_release\}\/scripts\/backup-cubing-hub\.sh"[\s\S]*"\$\{active_backup_script\}"/,
  );
  assert.match(
    deployScript,
    /if \[\[ "\$\{legacy_mode\}" == true && ! -x "\$\{BACKUP_SCRIPT\}" \]\]; then/,
  );
  assert.match(
    backupBootstrap,
    /readonly LEGACY_BACKUP_SCRIPT=\/Users\/homeserver\/Server\/scripts\/backup\/backup-cubing-hub\.sh/,
  );
  assert.match(
    backupBootstrap,
    /runtime config entry allowlist does not match[\s\S]*exec "\$\{release_dir\}\/scripts\/backup-cubing-hub\.sh"/,
  );
  for (const bootstrap of [restrictedWrapper, backupBootstrap]) {
    assert.match(
      bootstrap,
      /readonly LOCKF_BIN=\/usr\/bin\/lockf/,
    );
    assert.match(
      bootstrap,
      /readonly OPERATION_LOCK="\$\{APP_DIR\}\/\.cubing-hub-operation\.lock"/,
    );
    assert.match(bootstrap, /"\$\{LOCKF_BIN\}" -s -t 0 9/);
    assert.match(
      bootstrap,
      /Another Cubing Hub deploy or backup operation is already running/,
    );
  }
  assert.equal(restrictedWrapper.match(/<&3 3<&-/g)?.length, 2);
  assert.match(
    backupBootstrap,
    /RUNTIME_CONFIG_PENDING[\s\S]*an incomplete runtime config transaction requires recovery/,
  );
  assert.doesNotMatch(runtimeConfigDockerfile, /bootstrap|deploy-home-server-ci/);
  assert.match(
    setupGuide,
    /현재 운영 서버를 v2로 전환할 때는 이 worker를[\s\S]*branch 원본으로 교체하지 않고 stable deploy\/backup bootstrap 두 개만/,
  );
  assert.match(
    runbook,
    /deploy-home-server\.sh.*backup-home-server\.sh.*사전 설치하거나 branch 원본으로 교체하지 않는다/s,
  );
});

test("should_publishValidatedSnapshotsAndPlanRetentionBeforeOffsiteHandoff", () => {
  const dumpValidation = backupScript.indexOf(
    'if [[ ! -s "${db_dump_file}" ]]',
  );
  const snapshotInventory = backupScript.indexOf(
    "record_counts_text = \"\".join(",
  );
  const attachmentValidation = backupScript.indexOf(
    "post image file(s) referenced by database/dump are missing",
  );
  const finalMove = backupScript.indexOf(
    '/bin/mv "${work_dir}" "${final_dir}"',
  );
  const retention = backupScript.indexOf('"mode": "dry-run"');
  const offsite = backupScript.indexOf("stage_offsite_snapshot() {");

  assert.ok(dumpValidation >= 0);
  assert.ok(snapshotInventory > dumpValidation);
  assert.ok(attachmentValidation > snapshotInventory);
  assert.ok(finalMove > attachmentValidation);
  assert.ok(retention > finalMove);
  assert.ok(offsite > retention);
  assert.match(
    backupScript,
    /Usage: backup-cubing-hub\.sh \[--trigger scheduled\|predeploy\]/,
  );
  assert.match(backupScript, /"schemaVersion": 1/);
  assert.match(backupScript, /"status": "success"/);
  assert.match(backupScript, /"engine": "mysql"/);
  assert.match(backupScript, /--single-transaction/);
  assert.match(backupScript, /--complete-insert/);
  assert.match(backupScript, /--skip-extended-insert/);
  assert.match(backupScript, /--hex-blob/);
  assert.match(backupScript, /"recordCounts": dict\(sorted\(record_counts\.items\(\)\)\)/);
  assert.match(backupScript, /"recordCountsSource": "database\/dump"/);
  assert.match(backupScript, /"databaseReferences": \{/);
  assert.match(backupScript, /"source": "database\/dump"/);
  assert.match(
    backupScript,
    /"policy": \{"recent": 4, "dailyAtOrAfterKst": "06:00", "dailyDays": 7\}/,
  );
  assert.match(backupScript, /printf 'snapshot complete\\n' >"\$\{work_dir\}\/SUCCESS"/);
  assert.match(backupScript, /"\$\{AGE_BIN\}" -R "\$\{AGE_RECIPIENT_FILE\}"/);
  assert.match(backupScript, /\.XXXXXX\.partial/);
  assert.match(backupScript, /iCloud handoff checksum mismatch/);
  assert.match(backupScript, /age recipient file mode must be 600/);
  assert.match(backupScript, /prepare_private_directory "\$\{BACKUP_ROOT\}"/);
  assert.match(
    backupScript,
    /readonly HEARTBEAT_CONFIG_FILE="\$\{APP_DIR\}\/backup-heartbeats\.conf"/,
  );
  assert.match(backupScript, /backup heartbeat configuration mode must be 600/);
  assert.match(backupScript, /backup heartbeat configuration contains unexpected content/);
  assert.match(backupScript, /Backup heartbeat delivery failed: %s/);
  assert.doesNotMatch(backupScript, /BACKUP_QUERY=attachment-keys/);
  assert.doesNotMatch(backupScript, /BACKUP_QUERY=record-counts/);
  assert.match(backupScript, /export MYSQL_PWD="\$\{MYSQL_ROOT_PASSWORD\}"/);
  assert.doesNotMatch(backupScript, /--password=/);
  assert.match(
    backupScript,
    /cubing-hub-production-\(\\d\{8\}T\\d\{6\}Z\)/,
  );
  assert.doesNotMatch(
    backupScript,
    /rm -rf|find[^\n]*-delete|down[^\n]*(?:--volumes|-v)|volume rm|system prune/,
  );
});

test("should_runOneShotFlywayBeforeCutoverAndGateSuccessOnPublicSmoke", () => {
  const migrationFunction = deployScript.match(
    /run_one_shot_migration\(\) \{[\s\S]*?\n\}/,
  )?.[0];
  const pending = deployScript.lastIndexOf("write_pending_state \\");
  const migration = deployScript.lastIndexOf(
    'if ! run_one_shot_migration "${new_api_image}" "${new_web_image}"; then',
  );
  const imageWrite = deployScript.lastIndexOf(
    'write_image_env "${new_api_image}" "${new_web_image}"',
  );
  const publicSmoke = deployScript.indexOf(
    "elif ! public_smoke; then",
    imageWrite,
  );
  const successState = deployScript.lastIndexOf("write_success_state \\");

  assert.match(compose, /SPRING_FLYWAY_ENABLED: "false"/);
  assert.ok(migrationFunction);
  assert.match(
    migrationFunction,
    /-Dloader\.main=\$\{MIGRATION_MAIN_CLASS\}[\s\S]*PropertiesLauncher/,
  );
  assert.match(migrationFunction, /local candidate_api_image="\$1"/);
  assert.match(migrationFunction, /local candidate_web_image="\$2"/);
  assert.match(migrationFunction, /export API_IMAGE="\$\{candidate_api_image\}"/);
  assert.match(migrationFunction, /export WEB_IMAGE="\$\{candidate_web_image\}"/);
  assert.match(migrationFunction, /compose run \\\n[\s\S]*--pull never/);
  assert.ok(pending >= 0);
  assert.ok(migration > pending);
  assert.ok(imageWrite > migration);
  assert.ok(publicSmoke > imageWrite);
  assert.ok(successState > publicSmoke);
  assert.match(runbook, /candidate API image의 one-shot Flyway migration·validate/);
  assert.match(
    runbook,
    /최근 정상 snapshot 4개와 지난 7 calendar day마다 KST 06:00 이후/,
  );
});

test("should_keepAdminDatabaseAccessOnLoopbackOnly", () => {
  assert.match(adminCompose, /127\.0\.0\.1:3307:3307/);
  assert.match(adminCompose, /TCP:db:3306/);
  assert.doesNotMatch(serviceBlock(compose, "db"), /\n\s+ports:/);
});

test("should_failFrontendBuildWithoutProductionApiUrl", () => {
  assert.match(frontendDockerfile, /ARG VITE_API_BASE_URL/);
  assert.match(frontendDockerfile, /RUN test -n "\$\{VITE_API_BASE_URL\}"/);
  assert.match(
    frontendDockerfile,
    /COPY homeserver\/nginx\/home-server\.conf \/etc\/nginx\/conf\.d\/default\.conf/,
  );
});

test("should_excludeCredentialsAndGeneratedFilesFromDockerBuildContext", () => {
  assert.match(dockerIgnore, /^\.git$/m);
  assert.match(dockerIgnore, /^\*\*\/\.env$/m);
  assert.match(dockerIgnore, /^\*\*\/\.env\.\*$/m);
  assert.match(dockerIgnore, /^!\*\*\/\.env\.example$/m);
  assert.match(dockerIgnore, /^\*\*\/node_modules$/m);
  assert.match(dockerIgnore, /^backend\/build\/reports$/m);
  assert.doesNotMatch(dockerIgnore, /^backend\/build\/libs$/m);
});

test("should_runScheduledBackupFromRepositoryIndependentPath", () => {
  assert.match(
    launchAgent,
    /<string>com\.homeserver\.cubing-hub\.backup<\/string>/,
  );
  assert.match(
    launchAgent,
    /\/Users\/homeserver\/Server\/scripts\/backup\/backup-cubing-hub-bootstrap\.sh/,
  );
  assert.equal(launchAgent.match(/<key>Hour<\/key>/g)?.length, 4);
  assert.equal(launchAgent.match(/<key>Minute<\/key>/g)?.length, 4);
  for (const hour of [0, 6, 12, 18]) {
    assert.match(
      launchAgent,
      new RegExp(`<key>Hour</key>\\s*<integer>${hour}</integer>`),
    );
  }
  assert.equal(
    launchAgent.match(/<key>Minute<\/key>\s*<integer>5<\/integer>/g)?.length,
    4,
  );
  assert.doesNotMatch(launchAgent, /<key>KeepAlive<\/key>/);
  assert.doesNotMatch(launchAgent, /__REPO_DIR__|cd /);
});

function read(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

function serviceBlock(value, serviceName) {
  const startPattern = new RegExp(`\\n  ${serviceName}:\\n`);
  const startMatch = startPattern.exec(`\n${value}`);

  assert.ok(startMatch, `Missing service: ${serviceName}`);

  const start = Math.max(0, startMatch.index - 1);
  const remaining = value.slice(start + 1);
  const nextServiceOffset = remaining.slice(1).search(/\n  [A-Za-z0-9_-]+:\n/);

  return nextServiceOffset >= 0
    ? remaining.slice(0, nextServiceOffset + 1)
    : remaining;
}
