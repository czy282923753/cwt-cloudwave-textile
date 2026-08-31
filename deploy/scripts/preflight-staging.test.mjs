import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const source = readFileSync("deploy/scripts/preflight-staging.sh", "utf8");

test("freezes the zero-argument static-shell and one-FD9 lifecycle contract", () => {
  assert.equal(source.split("\n")[0], "#!/usr/bin/bash-static -p");
  assert.match(source, /\$# -eq 0/u);
  for (const token of ["LD_*", "BASH_FUNC_*", "DOCKER_*", "COMPOSE_*"]) assert.ok(source.includes(token));
  assert.equal((source.match(/flock --exclusive --nonblock 9/gu) ?? []).length, 1);
  assert.equal((source.match(/exec 9<>\/run\/lock\/cwt\/staging-start\.lock/gu) ?? []).length, 1);
  assert.match(source, /preflight-compose-graph\.mjs --protected-pre-start 9>&-/u);
  assert.match(source, /preflight-compose-graph\.mjs --protected-post-start 9>&-/u);
  assert.match(source, /trap 'cwt_signal 130' INT/u);
  assert.match(source, /trap 'cwt_signal 143' TERM/u);
  assert.match(source, /trap 'cwt_signal 129' HUP/u);
  assert.match(source, /wait -f "\$cwt_lifecycle_pid"/u);
  assert.match(source, /up --detach --wait --wait-timeout 120 --no-deps/u);
  assert.match(source, /web-staging worker-staging scheduler-staging valkey-staging/u);
  assert.doesNotMatch(source, /quiet.window|recovery.mode|post.total|retry|sleep/u);
});

test("documents fail-stop after total FD9-holder loss with no local re-entry", () => {
  const host = readFileSync("deploy/host/README.md", "utf8");
  const operations = readFileSync("docs/OPERATIONS_RUNBOOK.md", "utf8");
  for (const document of [host, operations]) {
    assert.match(document, /all FD9 holders|every holder/u);
    assert.match(document, /do not run|do not rerun/u);
    assert.match(document, /preserve read-only|preserve available read-only/u);
    assert.match(document, /escalate/u);
  }
});

test("keeps direct Node/tsx roles and package-manager-free schedules", () => {
  const compose = readFileSync("compose.yaml", "utf8");
  const production = readFileSync("deploy/schedule/production.crontab", "utf8");
  const staging = readFileSync("deploy/schedule/staging.crontab", "utf8");
  assert.doesNotMatch(`${compose}\n${production}\n${staging}`, /(?:^|[\s,["'])pnpm(?:$|[\s,\]"'])/mu);
  for (const document of [production, staging]) {
    assert.equal((document.match(/node --conditions=react-server --import=tsx/gu) ?? []).length, 3);
  }
  assert.match(compose, /profiles: \[production-ai\][\s\S]*restart: "no"/u);
});
