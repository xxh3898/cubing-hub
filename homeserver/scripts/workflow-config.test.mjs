import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [validateWorkflow, deployWorkflow, benchmarkWorkflow] =
  await Promise.all([
    read("../../.github/workflows/validate.yml"),
    read("../../.github/workflows/deploy.yml"),
    read("../../.github/workflows/performance-benchmark.yml"),
  ]);

test("should_validateDevPushAndMainPullRequestsBeforeRelease", () => {
  assert.match(
    validateWorkflow,
    /push:\n    branches:\n      - dev/,
  );
  assert.match(
    validateWorkflow,
    /pull_request:\n    branches:\n      - main/,
  );
  assert.match(validateWorkflow, /workflow_call:/);
  assert.match(
    deployWorkflow,
    /validate:\n    name: Validate release[\s\S]*uses: \.\/\.github\/workflows\/validate\.yml/,
  );
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
    /^    needs:\n      - backend/m,
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
  assert.doesNotMatch(deployWorkflow, /:latest|:main/);
  assert.doesNotMatch(deployWorkflow, /Docker Hub|DOCKERHUB|setup-qemu/);
});

test("should_requireExplicitRepositoryGateBeforePublishingOrDeploying", () => {
  assert.equal(
    countMatches(
      deployWorkflow,
      /if: github\.ref == 'refs\/heads\/main' && vars\.MAC_MINI_DEPLOY_ENABLED == 'true'/g,
    ),
    2,
  );
});

test("should_applyLeastPrivilegePermissionsPerJob", () => {
  const publish = workflowJob(deployWorkflow, "publish");
  const deploy = workflowJob(deployWorkflow, "deploy");

  assert.match(publish, /actions: read/);
  assert.match(publish, /contents: read/);
  assert.match(publish, /packages: write/);
  assert.doesNotMatch(publish, /id-token: write/);

  assert.match(deploy, /packages: read/);
  assert.match(deploy, /id-token: write/);
  assert.doesNotMatch(deploy, /packages: write/);
  assert.match(deploy, /environment: production/);
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
});

test("should_pinEveryExternalActionToFullCommitSha", () => {
  for (const workflow of [
    validateWorkflow,
    deployWorkflow,
    benchmarkWorkflow,
  ]) {
    for (const line of workflow.matchAll(/^\s*uses:\s*(\S+)/gm)) {
      const action = line[1];
      if (action.startsWith("./")) {
        continue;
      }
      assert.match(action, /^[^@]+@[0-9a-f]{40}$/);
    }
  }
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

function countMatches(value, pattern) {
  return [...value.matchAll(pattern)].length;
}
