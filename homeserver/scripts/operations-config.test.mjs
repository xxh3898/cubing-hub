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
  frontendDockerfile,
  launchAgent,
  dockerIgnore,
] = await Promise.all([
  read("../docker-compose.yml"),
  read("../docker-compose.admin.yml"),
  read("../.env.example"),
  read("./deploy-home-server.sh"),
  read("./deploy-home-server-ci.sh"),
  read("./backup-home-server.sh"),
  read("../docker/frontend.Dockerfile"),
  read("../launchd/com.cubinghub-backup.plist.example"),
  read("../../.dockerignore"),
]);

test("should_isolateDataServicesAndExposeOnlyWebToSharedEdge_when_productionRuns", () => {
  const db = serviceBlock(compose, "db");
  const redis = serviceBlock(compose, "redis");
  const api = serviceBlock(compose, "api");
  const web = serviceBlock(compose, "web");

  for (const service of [db, redis, api, web]) {
    assert.doesNotMatch(service, /\n\s+ports:/);
  }

  assert.match(db, /\n    networks:\n      - application/);
  assert.match(redis, /\n    networks:\n      - application/);
  assert.match(api, /\n    networks:\n      - application/);
  assert.match(
    web,
    /\n    networks:\n      application:\n      edge:\n        aliases:\n          - cubing-hub-web/,
  );
  assert.match(
    compose,
    /application:\n    internal: true[\s\S]*edge:\n    external: true\n    name: edge/,
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
    /\^deploy-cubing-hub\[\[:space:\]\]\(\[0-9a-fA-F\]\{40\}\)\[\[:space:\]\]\(\[A-Za-z0-9_-\]\+\)\$/,
  );
  assert.doesNotMatch(restrictedWrapper, /eval|bash -c|sh -c/);
  assert.match(
    restrictedWrapper,
    /\/Users\/homeserver\/Server\/scripts\/deploy\/deploy-cubing-hub\.sh/,
  );
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
    'if [[ -n "${previous_sha}" ]]; then\n  "${BACKUP_SCRIPT}"',
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
  assert.doesNotMatch(
    deployScript,
    /down[^\n]*(?:--volumes|-v)|volume rm|system prune/,
  );
});

test("should_validateBackupBeforeKeepingThreeSuccessfulSnapshots", () => {
  const dumpValidation = backupScript.indexOf(
    'if [[ ! -s "${db_dump_file}" ]]',
  );
  const attachmentValidation = backupScript.indexOf(
    'if [[ -s "${missing_files_file}" ]]',
  );
  const finalMove = backupScript.indexOf(
    '/bin/mv "${work_dir}" "${final_dir}"',
  );
  const retention = backupScript.indexOf("kept=0");

  assert.ok(dumpValidation >= 0);
  assert.ok(attachmentValidation > dumpValidation);
  assert.ok(finalMove > attachmentValidation);
  assert.ok(retention > finalMove);
  assert.match(backupScript, /readonly BACKUP_RETENTION_COUNT=3/);
  assert.match(backupScript, /if \[\[ "\$#" -ne 0 \]\]; then/);
  assert.match(
    backupScript,
    /CHAR_LENGTH\(object_key\) > 0 ORDER BY object_key/,
  );
  assert.match(backupScript, /export MYSQL_PWD="\$\{MYSQL_ROOT_PASSWORD\}"/);
  assert.doesNotMatch(backupScript, /--password=/);
  assert.match(
    backupScript,
    /\^cubing-hub-production-\[0-9\]\{8\}T\[0-9\]\{6\}Z\$/,
  );
  assert.doesNotMatch(
    backupScript,
    /down[^\n]*(?:--volumes|-v)|volume rm|system prune/,
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
    /\/Users\/homeserver\/Server\/scripts\/backup\/backup-cubing-hub\.sh/,
  );
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
