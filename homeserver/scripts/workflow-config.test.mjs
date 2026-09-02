import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [
  validateWorkflow,
  releaseWorkflow,
  deployWorkflow,
  reconcileWorkflow,
  benchmarkWorkflow,
  backendBuild,
  pathClassifier,
  releaseManifest,
  runtimeBaselineResolver,
  runtimeBaselineRecorder,
  runtimeInspectionVerifier,
] =
  await Promise.all([
    read("../../.github/workflows/validate.yml"),
    read("../../.github/workflows/release.yml"),
    read("../../.github/workflows/deploy.yml"),
    read("../../.github/workflows/reconcile-runtime-baseline.yml"),
    read("../../.github/workflows/performance-benchmark.yml"),
    read("../../backend/build.gradle"),
    read("../../scripts/classify-ci-paths.sh"),
    read("./release-manifest.sh"),
    read("./resolve-runtime-config-baseline.sh"),
    read("./record-runtime-config-baseline.sh"),
    read("./verify-runtime-baseline-inspection.sh"),
  ]);

test("should_validateDevPushAndDevAndMainPullRequestsBeforeRelease", () => {
  assert.match(
    validateWorkflow,
    /push:\n    branches:\n      - dev/,
  );
  assert.match(
    validateWorkflow,
    /pull_request:\n    branches:\n      - dev\n      - main/,
  );
  assert.match(validateWorkflow, /workflow_call:/);
  assert.match(
    releaseWorkflow,
    /validate:\n    name: Validate release[\s\S]*uses: \.\/\.github\/workflows\/validate\.yml/,
  );
});

test("should_keepStableRequiredJobsWhileSkippingUnrelatedHeavyWork", () => {
  assert.match(validateWorkflow, /changes:\n    name: Detect changes/);

  for (const jobId of [
    "infrastructure",
    "backend",
    "frontend",
    "api-image",
    "web-image",
  ]) {
    const job = workflowJob(validateWorkflow, jobId);

    assert.match(job, /^    needs:\n      - changes/m);
    assert.match(job, /^    if: \$\{\{ always\(\) \}\}$/m);
    assert.match(
      job,
      /- name: Fail when change detection fails\n        if: needs\.changes\.result != 'success'\n        run: exit 1/,
    );
    assert.match(job, /- name: Skip unrelated/);
  }

  assert.match(
    validateWorkflow,
    /\.\/scripts\/classify-ci-paths\.sh "\$\{changed_paths\[@\]\}"/,
  );
  assert.match(
    validateWorkflow,
    /\.\/scripts\/classify-ci-paths\.sh \\\n\s+"\.github\/workflows\/validate\.yml"/,
  );
});

test("should_failClosed_when_changedPathDiffFails", () => {
  const tempFileOffset = validateWorkflow.indexOf(
    'changed_paths_file="$(mktemp "${RUNNER_TEMP}/ci-changed-paths.XXXXXX")"',
  );
  const diffGuardOffset = validateWorkflow.indexOf(
    "if ! git diff",
    tempFileOffset,
  );
  const mapfileOffset = validateWorkflow.indexOf(
    "mapfile -d '' -t changed_paths",
    diffGuardOffset,
  );
  const classifierOffset = validateWorkflow.indexOf(
    './scripts/classify-ci-paths.sh "${changed_paths[@]}"',
    mapfileOffset,
  );

  assert.doesNotMatch(
    validateWorkflow,
    /mapfile -d '' -t changed_paths < <\([\s\S]*git diff/,
  );
  assert.ok(tempFileOffset >= 0, "Missing exact changed-path temp file");
  assert.ok(diffGuardOffset > tempFileOffset, "Diff must follow temp file setup");
  assert.ok(mapfileOffset > diffGuardOffset, "Mapfile must follow checked diff");
  assert.ok(
    classifierOffset > mapfileOffset,
    "Classifier must run only after the checked diff is loaded",
  );
  assert.match(
    validateWorkflow,
    /trap 'rm -f -- "\$\{changed_paths_file\}"' EXIT/,
  );
  assert.match(
    validateWorkflow.slice(diffGuardOffset, mapfileOffset),
    /if ! git diff \\\n+\s+--no-renames \\\n+\s+--name-only \\\n+\s+-z \\\n+\s+"\$\{base_sha\}" \\\n+\s+"\$\{GITHUB_SHA\}" \\\n+\s+>"\$\{changed_paths_file\}"; then[\s\S]*printf '%s\\n' 'Failed to detect changed paths\.' >&2[\s\S]*exit 1[\s\S]*fi/,
  );
  assert.match(
    validateWorkflow.slice(mapfileOffset, classifierOffset),
    /mapfile -d '' -t changed_paths \\\n+\s+<"\$\{changed_paths_file\}"/,
  );
});

test("should_gateEachRequiredJobWithItsMatchingChangeOutput", () => {
  const outputByJob = new Map([
    ["infrastructure", "infrastructure"],
    ["backend", "backend"],
    ["frontend", "frontend"],
    ["api-image", "api_image"],
    ["web-image", "web_image"],
  ]);

  for (const [jobId, expectedOutput] of outputByJob) {
    const job = workflowJob(validateWorkflow, jobId);
    const outputReferences = [
      ...job.matchAll(/needs\.changes\.outputs\.([a-z_]+)/g),
    ].map((match) => match[1]);

    assert.match(
      job,
      new RegExp(
        `needs\\.changes\\.outputs\\.${expectedOutput} != 'true'`,
      ),
    );
    assert.match(
      job,
      new RegExp(
        `needs\\.changes\\.outputs\\.${expectedOutput} == 'true'`,
      ),
    );
    assert.deepEqual(
      [...new Set(outputReferences)],
      [expectedOutput],
      `${jobId} must not reference another change output`,
    );

    const gatedSteps = job
      .split(/^      - name: /m)
      .slice(1)
      .filter(
        (step) =>
          !step.startsWith("Fail when change detection fails\n") &&
          !step.startsWith("Skip unrelated"),
      );

    assert.ok(gatedSteps.length > 0, `${jobId} must have gated work`);
    for (const step of gatedSteps) {
      const stepName = step.slice(0, step.indexOf("\n"));

      assert.match(
        step,
        new RegExp(
          `^        if: .*needs\\.changes\\.outputs\\.${expectedOutput} == 'true'`,
          "m",
        ),
        `${jobId}/${stepName} must use ${expectedOutput}`,
      );
    }
  }
});

test("should_forceFullValidationForMainReleaseArtifactConsumer", () => {
  const fullReleaseGuard =
    'if [[ "${REF_NAME}" == "refs/heads/main" ]]; then';
  const guardOffset = validateWorkflow.indexOf(fullReleaseGuard);
  const eventCaseOffset = validateWorkflow.indexOf(
    'case "${EVENT_NAME}" in',
  );

  assert.match(validateWorkflow, /REF_NAME: \$\{\{ github\.ref \}\}/);
  assert.ok(guardOffset >= 0, "Missing main release full-validation guard");
  assert.ok(
    guardOffset < eventCaseOffset,
    "Main release guard must run before path-aware event classification",
  );
  assert.match(
    validateWorkflow.slice(guardOffset, eventCaseOffset),
    /\.\/scripts\/classify-ci-paths\.sh \\\n\s+"\.github\/workflows\/validate\.yml"[\s\S]*exit 0/,
  );
  assert.match(
    workflowJob(releaseWorkflow, "publish"),
    /- name: Download backend jar[\s\S]*name: backend-jar-\$\{\{ github\.sha \}\}/,
  );
});

test("should_classifyComponentInfrastructureAndUnknownPathsSafely", () => {
  assert.deepEqual(classifyPaths(["frontend/src/App.jsx"]), {
    backend: "false",
    frontend: "true",
    infrastructure: "false",
    api_image: "false",
    web_image: "true",
  });
  assert.deepEqual(classifyPaths(["backend/src/main/java/App.java"]), {
    backend: "true",
    frontend: "false",
    infrastructure: "false",
    api_image: "true",
    web_image: "false",
  });
  assert.deepEqual(
    classifyPaths(["homeserver/docker/backend.Dockerfile"]),
    {
      backend: "true",
      frontend: "false",
      infrastructure: "true",
      api_image: "true",
      web_image: "false",
    },
  );
  assert.deepEqual(
    classifyPaths(["homeserver/nginx/home-server.conf"]),
    {
      backend: "false",
      frontend: "false",
      infrastructure: "true",
      api_image: "false",
      web_image: "true",
    },
  );
  assert.deepEqual(
    classifyPaths(["homeserver/scripts/backup-home-server.sh"]),
    {
      backend: "false",
      frontend: "false",
      infrastructure: "true",
      api_image: "false",
      web_image: "false",
    },
  );
  assert.deepEqual(classifyPaths(["AGENTS.md"]), {
    backend: "false",
    frontend: "false",
    infrastructure: "false",
    api_image: "false",
    web_image: "false",
  });
  assert.deepEqual(classifyPaths(["new-runtime/tool.toml"]), {
    backend: "true",
    frontend: "true",
    infrastructure: "true",
    api_image: "true",
    web_image: "true",
  });
  assert.deepEqual(classifyPaths(["frontend/src/큐브.jsx"]), {
    backend: "false",
    frontend: "true",
    infrastructure: "false",
    api_image: "false",
    web_image: "true",
  });
});

test("should_buildBackendArtifactBeforeApiImage", () => {
  assert.match(
    validateWorkflow,
    /\.\/gradlew test jacocoTestReport build --no-daemon/,
  );
  assert.match(
    validateWorkflow,
    /name: backend-jar-\$\{\{ github\.sha \}\}/,
  );
  assert.match(
    workflowJob(validateWorkflow, "api-image"),
    /^    needs:\n      - changes\n      - backend/m,
  );
  assert.match(
    workflowJob(validateWorkflow, "api-image"),
    /actions\/download-artifact@[0-9a-f]{40}/,
  );
  assert.match(
    releaseWorkflow,
    /name: backend-jar-\$\{\{ github\.sha \}\}/,
  );
});

test("should_alignJavaProvisioningWithBackendToolchain", () => {
  const canonicalJavaVersion = javaToolchainVersion(backendBuild);
  const workflowSetups = [
    [
      workflowJob(validateWorkflow, "backend"),
      `Set up Java ${canonicalJavaVersion}`,
    ],
    [
      workflowJob(benchmarkWorkflow, "benchmark"),
      `Setup JDK ${canonicalJavaVersion}`,
    ],
  ];

  assert.equal(canonicalJavaVersion, "25");

  for (const [workflow, expectedStepName] of workflowSetups) {
    const setupJavaStep = workflowActionStep(workflow, "actions/setup-java");

    assert.match(
      setupJavaStep,
      new RegExp(`^      - name: ${expectedStepName}$`, "m"),
    );
    assert.match(
      setupJavaStep,
      new RegExp(`^          java-version: "${canonicalJavaVersion}"$`, "m"),
    );
    assert.match(setupJavaStep, /^          distribution: "?temurin"?$/m);
    assert.match(setupJavaStep, /^          cache: gradle$/m);
  }
});

test("should_publishOnlyFullShaArm64ImagesToGhcr", () => {
  assert.match(
    releaseWorkflow,
    /API_IMAGE_NAME: ghcr\.io\/xxh3898\/cubing-hub-api/,
  );
  assert.match(
    releaseWorkflow,
    /WEB_IMAGE_NAME: ghcr\.io\/xxh3898\/cubing-hub-web/,
  );
  assert.equal(
    countMatches(releaseWorkflow, /platforms: linux\/arm64/g),
    3,
  );
  assert.match(
    releaseWorkflow,
    /tags: \$\{\{ env\.API_IMAGE_NAME \}\}:\$\{\{ github\.sha \}\}/,
  );
  assert.match(
    releaseWorkflow,
    /tags: \$\{\{ env\.WEB_IMAGE_NAME \}\}:\$\{\{ github\.sha \}\}/,
  );
  assert.match(
    releaseWorkflow,
    /RUNTIME_CONFIG_IMAGE_NAME: ghcr\.io\/xxh3898\/cubing-hub-runtime-config/,
  );
  assert.match(
    releaseWorkflow,
    /if: steps\.runtime-config-mode\.outputs\.mode == 'update'/,
  );
  assert.match(
    releaseWorkflow,
    /DATA_SERVICE_MAINTENANCE_REQUIRED: \$\{\{ steps\.data-service-maintenance\.outputs\.required \}\}/,
  );
  assert.match(
    releaseWorkflow,
    /RUNTIME_CONFIG_REVISION: \$\{\{ steps\.data-service-maintenance\.outputs\.runtime_config_revision \}\}/,
  );
  assert.match(
    releaseWorkflow,
    /resolve-runtime-config-baseline\.sh[\s\S]*steps\.runtime-baseline\.outputs\.revision/,
  );
  assert.match(runtimeBaselineResolver, /RUNTIME_ENVIRONMENT=production-runtime-config/);
  assert.match(runtimeBaselineResolver, /LEGACY_ENVIRONMENT=production/);
  assert.match(runtimeBaselineResolver, /task == "runtime-config:baseline"/);
  assert.match(
    runtimeBaselineResolver,
    /payload\.runtimeConfigDigest[\s\S]*sha256:\[0-9a-f\]\{64\}/,
  );
  assert.doesNotMatch(releaseWorkflow, /:latest|:main/);
  assert.doesNotMatch(releaseWorkflow, /Docker Hub|DOCKERHUB|setup-qemu/);
});

test("should_separateMainReleaseFromManualProductionDeployment", () => {
  assert.match(
    releaseWorkflow,
    /^on:\n  push:\n    branches:\n      - main$/m,
  );
  assert.doesNotMatch(releaseWorkflow, /workflow_dispatch:/);
  assert.match(
    workflowJob(releaseWorkflow, "publish"),
    /if: github\.ref == 'refs\/heads\/main'[\s\S]*Enforce build-once release attempt[\s\S]*GITHUB_RUN_ATTEMPT[\s\S]*!= 1/,
  );
  assert.doesNotMatch(
    releaseWorkflow,
    /environment: production|tailscale\/github-action|Configure restricted SSH|deploy-cubing-hub-v2|record-runtime-config-baseline\.sh|MAC_MINI_DEPLOY_ENABLED/,
  );

  assert.match(deployWorkflow, /^on:\n  workflow_dispatch:/m);
  assert.doesNotMatch(deployWorkflow, /\n  push:|docker\/build-push-action/);
  assert.match(deployWorkflow, /release_sha:[\s\S]*required: true[\s\S]*release_run_id:/);
  assert.match(
    workflowJob(deployWorkflow, "validate-intent"),
    /\.path == \$release_workflow[\s\S]*\.event == "push"[\s\S]*\.head_branch == "main"[\s\S]*\.head_sha == \$release_sha[\s\S]*\.conclusion == "success"[\s\S]*\.run_attempt == 1/,
  );
  assert.match(deployWorkflow, /git merge-base --is-ancestor/);
  assert.match(deployWorkflow, /run-id: \$\{\{ inputs\.release_run_id \}\}/);
  assert.match(deployWorkflow, /release-manifest\.sh \\\n+\s+validate/);
  assert.match(
    releaseWorkflow,
    /concurrency:\n  group: cubing-hub-release\n  cancel-in-progress: false/,
  );
  assert.match(
    deployWorkflow,
    /concurrency:\n  group: cubing-hub-production\n  cancel-in-progress: false/,
  );
});

test("should_publishMaintenanceRuntimeConfigWithoutStartingProductionDeploy", () => {
  const publish = workflowJob(releaseWorkflow, "publish");
  const validateIntent = workflowJob(deployWorkflow, "validate-intent");

  assert.match(
    publish,
    /- name: Detect data-service maintenance\n        id: data-service-maintenance[\s\S]*detect-data-service-maintenance\.sh \\\n+\s+"\$\{RUNTIME_BASELINE_SHA\}" \\\n+\s+"\$\{GITHUB_SHA\}"/,
  );
  assert.match(
    publish,
    /if \[\[ "\$\{required\}" == true && "\$\{RUNTIME_CONFIG_MODE\}" != update \]\]; then[\s\S]*Data-service maintenance requires a runtime config update/,
  );
  assert.match(
    publish,
    /- name: Build and publish runtime config image[\s\S]*if: steps\.runtime-config-mode\.outputs\.mode == 'update'[\s\S]*push: true/,
  );
  assert.match(
    publish,
    /Runtime config revision:[\s\S]*Runtime config digest:[\s\S]*Data-service maintenance required:[\s\S]*Production deploy: `not started`/,
  );
  assert.match(
    validateIntent,
    /if \[\[ "\$\{actual_maintenance_required\}" == true \]\]; then[\s\S]*Release requires dedicated data-service maintenance/,
  );
  assert.doesNotMatch(validateIntent, /tailscale\/github-action|home-mini/);
});

test("should_resolveRuntimeBaselineWithExplicitLegacyBootstrapAndPagination", () => {
  assert.match(runtimeBaselineResolver, /readonly PAGE_SIZE=100/);
  assert.match(
    runtimeBaselineResolver,
    /deployments\?environment=\$\{environment\}&per_page=\$\{PAGE_SIZE\}&page=\$\{page\}/,
  );
  assert.match(
    runtimeBaselineResolver,
    /resolve_environment "\$\{RUNTIME_ENVIRONMENT\}"[\s\S]*success\)[\s\S]*baseline_source=runtime[\s\S]*empty\)[\s\S]*resolve_environment "\$\{LEGACY_ENVIRONMENT\}"/,
  );
  assert.match(
    runtimeBaselineResolver,
    /no-success\)[\s\S]*runtime config deployments exist without a successful baseline/,
  );
  assert.match(
    runtimeBaselineResolver,
    /baseline_source=legacy-bootstrap[\s\S]*baseline_source=new-install-bootstrap/,
  );
  assert.match(runtimeBaselineResolver, /printf 'digest=%s\\n'/);
});

test("should_notLetManualDeployBypassDataServiceMaintenance", () => {
  const publish = workflowJob(releaseWorkflow, "publish");
  const runtimeDetection = publish.slice(
    publish.indexOf("- name: Detect runtime config changes"),
    publish.indexOf("- name: Detect data-service maintenance"),
  );
  const maintenanceDetection = publish.slice(
    publish.indexOf("- name: Detect data-service maintenance"),
    publish.indexOf("- name: Download backend jar"),
  );

  assert.match(
    runtimeDetection,
    /detect-runtime-config-change\.sh \\\n+\s+"\$\{RUNTIME_BASELINE_SHA\}" \\\n+\s+"\$\{GITHUB_SHA\}" \\\n+\s+false/,
  );
  assert.doesNotMatch(releaseWorkflow + deployWorkflow, /sync_runtime_config|FORCE_SYNC/);
  assert.match(
    maintenanceDetection,
    /detect-data-service-maintenance\.sh[\s\S]*"\$\{RUNTIME_BASELINE_SHA\}"[\s\S]*"\$\{GITHUB_SHA\}"/,
  );
  assert.match(
    workflowJob(deployWorkflow, "validate-intent"),
    /detect-data-service-maintenance\.sh[\s\S]*"\$\{actual_baseline_revision\}"[\s\S]*"\$\{RELEASE_SHA\}"[\s\S]*Release requires dedicated data-service maintenance/,
  );
});

test("should_applyLeastPrivilegePermissionsPerJob", () => {
  const publish = workflowJob(releaseWorkflow, "publish");
  const validateDeployIntent = workflowJob(deployWorkflow, "validate-intent");
  const deploy = workflowJob(deployWorkflow, "deploy");
  const recordRuntime = workflowJob(deployWorkflow, "record-runtime-baseline");
  const validateIntent = workflowJob(reconcileWorkflow, "validate-intent");
  const authorizeRuntime = workflowJob(
    reconcileWorkflow,
    "authorize-runtime-reconcile",
  );
  const inspectAndRecord = workflowJob(
    reconcileWorkflow,
    "inspect-and-record",
  );

  assert.match(publish, /actions: read/);
  assert.match(publish, /contents: read/);
  assert.match(publish, /deployments: read/);
  assert.match(publish, /packages: write/);
  assert.doesNotMatch(publish, /id-token: write/);

  assert.match(validateDeployIntent, /actions: read/);
  assert.match(validateDeployIntent, /contents: read/);
  assert.match(validateDeployIntent, /deployments: read/);
  assert.doesNotMatch(
    validateDeployIntent,
    /contents: write|deployments: write|id-token: write|packages: write|actions: write/,
  );

  assert.match(deploy, /packages: read/);
  assert.match(deploy, /id-token: write/);
  assert.doesNotMatch(deploy, /packages: write/);
  assert.match(deploy, /environment: production/);

  assert.match(recordRuntime, /contents: read/);
  assert.match(recordRuntime, /deployments: write/);
  assert.doesNotMatch(recordRuntime, /id-token: write|packages: write/);

  assert.match(validateIntent, /contents: read/);
  assert.doesNotMatch(
    validateIntent,
    /contents: write|deployments: write|id-token: write|packages: write|actions: write/,
  );

  assert.match(authorizeRuntime, /contents: read/);
  assert.doesNotMatch(
    authorizeRuntime,
    /contents: write|deployments: write|id-token: write|packages: write|actions: write/,
  );

  assert.match(inspectAndRecord, /contents: read/);
  assert.match(inspectAndRecord, /deployments: write/);
  assert.match(inspectAndRecord, /id-token: write/);
  assert.doesNotMatch(
    inspectAndRecord,
    /contents: write|packages: write|actions: write/,
  );
  assert.match(
    authorizeRuntime,
    /environment:\n      name: production-runtime-config\n      deployment: false/,
  );
  assert.match(
    inspectAndRecord,
    /environment:\n      name: production\n      deployment: false/,
  );
});

test("should_useTailscaleOidcAndRestrictedSshForDeployment", () => {
  assert.match(
    deployWorkflow,
    /uses: tailscale\/github-action@[0-9a-f]{40}/,
  );
  assert.match(deployWorkflow, /oauth-client-id: \$\{\{ secrets\.TS_OAUTH_CLIENT_ID \}\}/);
  assert.match(deployWorkflow, /audience: \$\{\{ secrets\.TS_AUDIENCE \}\}/);
  assert.match(deployWorkflow, /tags: tag:ci/);
  assert.match(deployWorkflow, /ping: home-mini/);
  assert.match(
    deployWorkflow,
    /deploy_command="deploy-cubing-hub-v2 \$\{RELEASE_SHA\} keep \$\{GITHUB_ACTOR\}"/,
  );
  assert.match(deployWorkflow, /StrictHostKeyChecking=yes/);
  assert.doesNotMatch(deployWorkflow, /ssh-keyscan|StrictHostKeyChecking=no/);
  assert.match(reconcileWorkflow, /uses: tailscale\/github-action@[0-9a-f]{40}/);
  assert.match(
    reconcileWorkflow,
    /inspection_command="inspect-cubing-hub-runtime \$\{EXPECTED_APPLICATION_REVISION\} \$\{EXPECTED_RUNTIME_CONFIG_REVISION\} \$\{EXPECTED_RUNTIME_CONFIG_DIGEST\} \$\{EXPECTED_DB_IMAGE\} \$\{EXPECTED_DB_VOLUME\} \$\{EXPECTED_MYSQL_VERSION\}"/,
  );
  assert.doesNotMatch(reconcileWorkflow, /ssh-keyscan|StrictHostKeyChecking=no/);
});

test("should_gateProductionCredentialAccessAfterReleasePreflight", () => {
  const validateIntent = workflowJob(deployWorkflow, "validate-intent");
  const deploy = workflowJob(deployWorkflow, "deploy");
  const productionSecrets = [
    "TS_OAUTH_CLIENT_ID",
    "TS_AUDIENCE",
    "HOME_MINI_SSH_KEY",
    "HOME_MINI_KNOWN_HOSTS",
  ];

  assert.doesNotMatch(validateIntent, /^    environment:/m);
  assert.doesNotMatch(
    validateIntent,
    /TS_OAUTH_CLIENT_ID|TS_AUDIENCE|HOME_MINI_SSH_KEY|HOME_MINI_KNOWN_HOSTS/,
  );
  assert.match(deploy, /^    needs:\n      - validate-intent$/m);
  assert.match(deploy, /environment: production/);
  assert.match(deploy, /Confirm deploy kill switch[\s\S]*MAC_MINI_DEPLOY_ENABLED/);

  for (const secret of productionSecrets) {
    assert.equal(countLiteral(deployWorkflow, `\${{ secrets.${secret} }}`), 1);
    assert.match(deploy, new RegExp(`secrets\\.${secret}`));
  }
});

test("should_gateRuntimeReconciliationApprovalBeforeProductionCredentialAccess", () => {
  const validateIntent = workflowJob(reconcileWorkflow, "validate-intent");
  const authorizeRuntime = workflowJob(
    reconcileWorkflow,
    "authorize-runtime-reconcile",
  );
  const inspectAndRecord = workflowJob(
    reconcileWorkflow,
    "inspect-and-record",
  );
  const credentialSecrets = [
    "TS_OAUTH_CLIENT_ID",
    "TS_AUDIENCE",
    "HOME_MINI_SSH_KEY",
    "HOME_MINI_KNOWN_HOSTS",
  ];
  const reconciliationInputs = [
    "expected_application_revision",
    "expected_runtime_config_revision",
    "expected_runtime_config_digest",
    "expected_db_image",
    "expected_db_volume",
    "expected_mysql_version",
  ];

  assert.match(
    reconcileWorkflow,
    /concurrency:\n  group: cubing-hub-production\n  cancel-in-progress: false/,
  );

  assert.doesNotMatch(validateIntent, /^    environment:/m);
  assert.doesNotMatch(validateIntent, /\$\{\{ secrets\./);

  assert.match(
    authorizeRuntime,
    /^    needs:\n      - validate-intent$/m,
  );
  assert.match(
    authorizeRuntime,
    /environment:\n      name: production-runtime-config\n      deployment: false/,
  );
  assert.doesNotMatch(authorizeRuntime, /\$\{\{ secrets\./);
  assert.doesNotMatch(authorizeRuntime, /always\(\)/);
  assert.doesNotMatch(
    authorizeRuntime,
    /tailscale\/github-action|Configure restricted SSH|inspect-cubing-hub-runtime/,
  );

  assert.match(
    inspectAndRecord,
    /^    needs:\n      - authorize-runtime-reconcile$/m,
  );
  assert.doesNotMatch(inspectAndRecord, /always\(\)|- validate-intent/);
  assert.match(
    inspectAndRecord,
    /environment:\n      name: production\n      deployment: false/,
  );

  for (const secret of credentialSecrets) {
    const reference = `\${{ secrets.${secret} }}`;

    assert.equal(countLiteral(reconcileWorkflow, reference), 1);
    assert.match(inspectAndRecord, new RegExp(`secrets\\.${secret}`));
  }

  for (const input of reconciliationInputs) {
    const reference = new RegExp(`inputs\\.${input}`);

    assert.match(validateIntent, reference);
    assert.match(inspectAndRecord, reference);
  }

  assert.match(
    runtimeBaselineRecorder,
    /readonly RUNTIME_ENVIRONMENT=production-runtime-config/,
  );
});

test("should_recordRuntimeBaselineOnlyAfterSafeRuntimeDeploySuccess", () => {
  const recordRuntime = workflowJob(deployWorkflow, "record-runtime-baseline");

  assert.match(recordRuntime, /always\(\)/);
  assert.match(recordRuntime, /needs\.validate-intent\.result == 'success'/);
  assert.match(recordRuntime, /needs\.deploy\.result == 'success'/);
  assert.match(recordRuntime, /runtime_config_mode == 'update'/);
  assert.match(
    recordRuntime,
    /record-runtime-config-baseline\.sh \\\n+\s+normal-update/,
  );
  assert.match(runtimeBaselineRecorder, /environment: \$environment/);
  assert.match(runtimeBaselineRecorder, /required_contexts: \[\]/);
  assert.match(runtimeBaselineRecorder, /auto_merge: false/);
  assert.match(runtimeBaselineRecorder, /state: "success"/);
  assert.doesNotMatch(
    workflowJob(releaseWorkflow, "publish"),
    /record-runtime-config-baseline\.sh/,
  );
});

test("should_validateDeterministicReleaseManifestWithoutExecutingIt", () => {
  assert.match(releaseManifest, /manifest_version \\\n+[\s\S]*repository \\\n+[\s\S]*release_revision/);
  assert.match(releaseManifest, /actual_keys.*expected_keys/s);
  assert.match(releaseManifest, /API image revision does not match/);
  assert.match(releaseManifest, /Web image revision does not match/);
  assert.match(releaseManifest, /keep mode must not claim a newly published runtime config/);
  assert.match(releaseManifest, /data-service maintenance requires a runtime config artifact/);
  assert.doesNotMatch(releaseManifest, /\beval\s+|^\s*(?:source|\.)\s+/m);
  assert.match(
    releaseWorkflow,
    /release-manifest-\$\{\{ github\.sha \}\}-\$\{\{ github\.run_id \}\}-\$\{\{ github\.run_attempt \}\}/,
  );
});

test("should_reconcileOnlyExplicitVerifiedHostStateWithoutMutatingProduction", () => {
  const validateIntent = workflowJob(reconcileWorkflow, "validate-intent");
  const inspectAndRecord = workflowJob(
    reconcileWorkflow,
    "inspect-and-record",
  );

  assert.match(reconcileWorkflow, /^on:\n  workflow_dispatch:/m);
  assert.doesNotMatch(reconcileWorkflow, /\n  push:|\n  pull_request:/);
  assert.match(validateIntent, /if: github\.ref == 'refs\/heads\/main'/);
  assert.match(validateIntent, /git merge-base --is-ancestor/);
  assert.match(inspectAndRecord, /verify-runtime-baseline-inspection\.sh/);
  assert.match(
    inspectAndRecord,
    /record-runtime-config-baseline\.sh \\\n+\s+maintenance-reconcile/,
  );
  assert.match(runtimeInspectionVerifier, /APPLICATION_REVISION/);
  assert.match(runtimeInspectionVerifier, /RUNTIME_CONFIG_REVISION/);
  assert.match(runtimeInspectionVerifier, /PENDING/);
  assert.match(runtimeInspectionVerifier, /SERVICE_SET/);
  assert.doesNotMatch(
    reconcileWorkflow,
    /docker compose (?:up|down)|runtime-config\/state|runtime-config\/current|volume rm/,
  );
});

test("should_pinEveryExternalActionToFullCommitSha", () => {
  const expectedDockerBuildAction =
    "docker/build-push-action@53b7df96c91f9c12dcc8a07bcb9ccacbed38856a";
  const externalActions = [];
  const quotedKeyAction = `example/action@${"a".repeat(40)}`;
  const quotedValueAction = `example/quoted-action@${"b".repeat(40)}`;

  assert.deepEqual(
    actionReferences(
      `steps:\n  - "uses": ${quotedKeyAction}\n  - 'uses': "${quotedValueAction}"\n`,
    ),
    [quotedKeyAction, quotedValueAction],
  );
  assert.throws(
    () => actionReferences("steps:\n  - { uses: example/action@v1 }\n"),
    /Unsupported uses syntax/,
  );

  for (const workflow of [
    validateWorkflow,
    releaseWorkflow,
    deployWorkflow,
    reconcileWorkflow,
    benchmarkWorkflow,
  ]) {
    for (const action of actionReferences(workflow)) {
      if (action.startsWith("./")) {
        continue;
      }
      externalActions.push(action);
      assert.match(action, /^[^@]+@[0-9a-f]{40}$/);
      if (action.startsWith("docker/build-push-action@")) {
        assert.equal(action, expectedDockerBuildAction);
      }
    }
  }
  assert.ok(externalActions.length > 0);
});

test("should_haveNoActiveAwsEc2OrSelfHostedDeploymentPath", () => {
  const activeWorkflows = validateWorkflow + releaseWorkflow + deployWorkflow;
  assert.doesNotMatch(
    activeWorkflows,
    /AWS_|aws-actions|amazon|CloudFront|S3_BUCKET|EC2_|self-hosted|Docker Hub|DOCKERHUB/,
  );
});

function read(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

function classifyPaths(paths) {
  const result = spawnSync(
    new URL("../../scripts/classify-ci-paths.sh", import.meta.url).pathname,
    paths,
    {
      encoding: "utf8",
      env: {
        ...process.env,
        GITHUB_OUTPUT: "",
      },
    },
  );

  assert.equal(result.status, 0, result.error?.message ?? result.stderr);
  assert.match(pathClassifier, /^#!\/bin\/sh\n\nset -eu$/m);

  return Object.fromEntries(
    result.stdout
      .trim()
      .split("\n")
      .map((line) => line.split("=")),
  );
}

function workflowJob(workflow, jobId) {
  const header = `\n  ${jobId}:\n`;
  const start = workflow.indexOf(header);

  assert.ok(start >= 0, `Missing workflow job: ${jobId}`);

  const bodyStart = start + header.length;
  const remaining = workflow.slice(bodyStart);
  const nextJobOffset = remaining.search(/\n  [A-Za-z0-9_-]+:\n/);

  return nextJobOffset >= 0
    ? workflow.slice(start, bodyStart + nextJobOffset)
    : workflow.slice(start);
}

function workflowActionStep(workflow, actionName) {
  const actionReferencesForName = actionReferences(workflow).filter(
    (reference) => reference.startsWith(`${actionName}@`),
  );

  assert.equal(
    actionReferencesForName.length,
    1,
    `Expected exactly one ${actionName} action`,
  );

  const actionOffset = workflow.indexOf(
    `uses: ${actionReferencesForName[0]}`,
  );
  const stepStart = workflow.lastIndexOf("\n      - name: ", actionOffset);
  const nextStepOffset = workflow.indexOf("\n      - name: ", actionOffset);

  assert.ok(stepStart >= 0, `Missing step for ${actionName}`);

  return workflow.slice(
    stepStart + 1,
    nextStepOffset >= 0 ? nextStepOffset : workflow.length,
  );
}

function javaToolchainVersion(buildGradle) {
  const versions = [
    ...buildGradle.matchAll(/JavaLanguageVersion\.of\((\d+)\)/g),
  ].map((match) => match[1]);

  assert.equal(versions.length, 1, "Expected one Java toolchain version");

  return versions[0];
}

function countMatches(value, pattern) {
  return [...value.matchAll(pattern)].length;
}

function countLiteral(value, needle) {
  return value.split(needle).length - 1;
}

function actionReferences(workflow) {
  const possibleUsesKey = /(?:^|[\s{,-])(?:"uses"|'uses'|uses)\s*:/;
  const actionReference =
    /^\s*(?:-\s*)?(?:"uses"|'uses'|uses)\s*:\s*(?:"([^"]+)"|'([^']+)'|(\S+))(?:\s+#.*)?\s*$/;
  const actions = [];

  for (const line of workflow.split("\n")) {
    const match = actionReference.exec(line);
    if (match) {
      actions.push(match[1] ?? match[2] ?? match[3]);
      continue;
    }
    if (
      !line.trimStart().startsWith("#") &&
      possibleUsesKey.test(line)
    ) {
      assert.fail(`Unsupported uses syntax: ${line.trim()}`);
    }
  }

  return actions;
}
