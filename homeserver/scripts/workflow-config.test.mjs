import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [
  validateWorkflow,
  deployWorkflow,
  reconcileWorkflow,
  benchmarkWorkflow,
  backendBuild,
  pathClassifier,
  runtimeBaselineResolver,
  runtimeBaselineRecorder,
  runtimeInspectionVerifier,
] =
  await Promise.all([
    read("../../.github/workflows/validate.yml"),
    read("../../.github/workflows/deploy.yml"),
    read("../../.github/workflows/reconcile-runtime-baseline.yml"),
    read("../../.github/workflows/performance-benchmark.yml"),
    read("../../backend/build.gradle"),
    read("../../scripts/classify-ci-paths.sh"),
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
    deployWorkflow,
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
    workflowJob(deployWorkflow, "publish"),
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
    deployWorkflow,
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
    deployWorkflow,
    /API_IMAGE_NAME: ghcr\.io\/xxh3898\/cubing-hub-api/,
  );
  assert.match(
    deployWorkflow,
    /WEB_IMAGE_NAME: ghcr\.io\/xxh3898\/cubing-hub-web/,
  );
  assert.equal(
    countMatches(deployWorkflow, /platforms: linux\/arm64/g),
    3,
  );
  assert.match(
    deployWorkflow,
    /tags: \$\{\{ env\.API_IMAGE_NAME \}\}:\$\{\{ github\.sha \}\}/,
  );
  assert.match(
    deployWorkflow,
    /tags: \$\{\{ env\.WEB_IMAGE_NAME \}\}:\$\{\{ github\.sha \}\}/,
  );
  assert.match(
    deployWorkflow,
    /RUNTIME_CONFIG_IMAGE_NAME: ghcr\.io\/xxh3898\/cubing-hub-runtime-config/,
  );
  assert.match(
    deployWorkflow,
    /if: steps\.runtime-config-mode\.outputs\.mode == 'update'/,
  );
  assert.match(
    deployWorkflow,
    /data_service_maintenance_required: \$\{\{ steps\.data-service-maintenance\.outputs\.required \}\}/,
  );
  assert.match(
    deployWorkflow,
    /runtime_config_revision: \$\{\{ steps\.data-service-maintenance\.outputs\.runtime_config_revision \}\}/,
  );
  assert.match(
    deployWorkflow,
    /resolve-runtime-config-baseline\.sh[\s\S]*steps\.runtime-baseline\.outputs\.revision/,
  );
  assert.match(runtimeBaselineResolver, /RUNTIME_ENVIRONMENT=production-runtime-config/);
  assert.match(runtimeBaselineResolver, /LEGACY_ENVIRONMENT=production/);
  assert.match(runtimeBaselineResolver, /task == "runtime-config:baseline"/);
  assert.match(
    runtimeBaselineResolver,
    /payload\.runtimeConfigDigest[\s\S]*sha256:\[0-9a-f\]\{64\}/,
  );
  assert.doesNotMatch(deployWorkflow, /:latest|:main/);
  assert.doesNotMatch(deployWorkflow, /Docker Hub|DOCKERHUB|setup-qemu/);
});

test("should_requireExplicitRepositoryGateBeforePublishingOrDeploying", () => {
  assert.equal(
    countMatches(
      deployWorkflow,
      /if: github\.ref == 'refs\/heads\/main' && vars\.MAC_MINI_DEPLOY_ENABLED == 'true'/g,
    ),
    1,
  );
  assert.match(
    workflowJob(deployWorkflow, "publish"),
    /if: github\.ref == 'refs\/heads\/main' && vars\.MAC_MINI_DEPLOY_ENABLED == 'true'/,
  );
  assert.match(
    workflowJob(deployWorkflow, "deploy"),
    /if: >-\n      github\.ref == 'refs\/heads\/main'\n      && vars\.MAC_MINI_DEPLOY_ENABLED == 'true'\n      && needs\.publish\.outputs\.data_service_maintenance_required == 'false'/,
  );
});

test("should_publishMaintenanceRuntimeConfigWithoutStartingProductionDeploy", () => {
  const publish = workflowJob(deployWorkflow, "publish");
  const deploy = workflowJob(deployWorkflow, "deploy");

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
    /Runtime config revision:[\s\S]*Runtime config digest:[\s\S]*Data-service maintenance:[\s\S]*Production deploy:/,
  );
  assert.match(
    deploy,
    /needs\.publish\.outputs\.data_service_maintenance_required == 'false'/,
  );
  assert.doesNotMatch(publish, /tailscale\/github-action|home-mini/);
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

test("should_notLetForcedRuntimeSyncBypassDataServiceMaintenance", () => {
  const publish = workflowJob(deployWorkflow, "publish");
  const runtimeDetection = publish.slice(
    publish.indexOf("- name: Detect runtime config changes"),
    publish.indexOf("- name: Detect data-service maintenance"),
  );
  const maintenanceDetection = publish.slice(
    publish.indexOf("- name: Detect data-service maintenance"),
    publish.indexOf("- name: Download backend jar"),
  );

  assert.match(runtimeDetection, /FORCE_SYNC: \$\{\{ inputs\.sync_runtime_config \|\| false \}\}/);
  assert.doesNotMatch(maintenanceDetection, /FORCE_SYNC|sync_runtime_config/);
  assert.match(
    maintenanceDetection,
    /detect-data-service-maintenance\.sh[\s\S]*"\$\{RUNTIME_BASELINE_SHA\}"[\s\S]*"\$\{GITHUB_SHA\}"/,
  );
});

test("should_applyLeastPrivilegePermissionsPerJob", () => {
  const publish = workflowJob(deployWorkflow, "publish");
  const deploy = workflowJob(deployWorkflow, "deploy");
  const recordRuntime = workflowJob(deployWorkflow, "record-runtime-baseline");
  const reconcile = workflowJob(reconcileWorkflow, "reconcile");

  assert.match(publish, /actions: read/);
  assert.match(publish, /contents: read/);
  assert.match(publish, /deployments: read/);
  assert.match(publish, /packages: write/);
  assert.doesNotMatch(publish, /id-token: write/);

  assert.match(deploy, /packages: read/);
  assert.match(deploy, /id-token: write/);
  assert.doesNotMatch(deploy, /packages: write/);
  assert.match(deploy, /environment: production/);

  assert.match(recordRuntime, /contents: read/);
  assert.match(recordRuntime, /deployments: write/);
  assert.doesNotMatch(recordRuntime, /id-token: write|packages: write/);

  assert.match(reconcile, /contents: read/);
  assert.match(reconcile, /deployments: write/);
  assert.match(reconcile, /id-token: write/);
  assert.doesNotMatch(reconcile, /contents: write|packages: write|actions: write/);
  assert.match(
    reconcile,
    /environment:\n      name: production-runtime-config\n      deployment: false/,
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
    /deploy_command="deploy-cubing-hub-v2 \$\{GITHUB_SHA\} keep \$\{GITHUB_ACTOR\}"/,
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

test("should_recordRuntimeBaselineOnlyAfterSafeRuntimeDeploySuccess", () => {
  const recordRuntime = workflowJob(deployWorkflow, "record-runtime-baseline");

  assert.match(recordRuntime, /always\(\)/);
  assert.match(recordRuntime, /needs\.publish\.result == 'success'/);
  assert.match(recordRuntime, /needs\.deploy\.result == 'success'/);
  assert.match(recordRuntime, /runtime_config_mode == 'update'/);
  assert.match(
    recordRuntime,
    /data_service_maintenance_required == 'false'/,
  );
  assert.match(
    recordRuntime,
    /record-runtime-config-baseline\.sh \\\n+\s+normal-update/,
  );
  assert.match(runtimeBaselineRecorder, /environment: \$environment/);
  assert.match(runtimeBaselineRecorder, /required_contexts: \[\]/);
  assert.match(runtimeBaselineRecorder, /auto_merge: false/);
  assert.match(runtimeBaselineRecorder, /state: "success"/);
  assert.doesNotMatch(
    workflowJob(deployWorkflow, "publish"),
    /record-runtime-config-baseline\.sh/,
  );
});

test("should_reconcileOnlyExplicitVerifiedHostStateWithoutMutatingProduction", () => {
  const reconcile = workflowJob(reconcileWorkflow, "reconcile");

  assert.match(reconcileWorkflow, /^on:\n  workflow_dispatch:/m);
  assert.doesNotMatch(reconcileWorkflow, /\n  push:|\n  pull_request:/);
  assert.match(reconcile, /if: github\.ref == 'refs\/heads\/main'/);
  assert.match(reconcile, /git merge-base --is-ancestor/);
  assert.match(reconcile, /verify-runtime-baseline-inspection\.sh/);
  assert.match(
    reconcile,
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
  const activeWorkflows = validateWorkflow + deployWorkflow;
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
