import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "../..");

function parseJournal(source) {
  return Object.fromEntries(source.split("\n").filter((line) => line && !line.startsWith("[")).map((line) => {
    const separator = line.indexOf("=");
    return [line.slice(0, separator), line.slice(separator + 1)];
  }));
}

test("journald and provider-neutral monitoring policy encode exact S6-05 bounds", async () => {
  const journal = parseJournal(await readFile(join(root, "deploy/monitoring/journald-cwt.conf"), "utf8"));
  const policy = JSON.parse(await readFile(join(root, "deploy/monitoring/monitoring-policy.v1.json"), "utf8"));
  assert.deepEqual(journal, {
    Storage: "persistent", Compress: "yes", Seal: "yes", SystemMaxUse: "4G", SystemKeepFree: "1G",
    MaxRetentionSec: "14day", MaxFileSec: "1day", ForwardToSyslog: "no",
  });
  assert.equal(policy.logs.driver, "journald");
  assert.equal(policy.logs.maximumBytes, 4 * 1024 ** 3);
  assert.equal(policy.logs.maximumAgeSeconds, 14 * 24 * 60 * 60);
  assert.equal(policy.alerts.independentNonSmtpChannelRequired, true);
  assert.equal(policy.alerts.smtpOnlyAllowed, false);
  assert.equal(JSON.stringify(policy).match(/dsn|token|recipient|endpoint/giu), null);
});

test("disposable noisy-log lab crosses both limits without retaining payload evidence", async () => {
  const directory = await mkdtemp(join(tmpdir(), "cwt-journal-policy-"));
  try {
    const now = new Date("2026-08-31T12:00:00.000Z");
    const entries = [];
    for (let index = 0; index < 20; index += 1) {
      const path = join(directory, `journal-${String(index).padStart(2, "0")}.synthetic`);
      await writeFile(path, Buffer.alloc(1024));
      const modified = new Date(now.getTime() - index * 24 * 60 * 60 * 1_000);
      await utimes(path, modified, modified);
      entries.push({ path, modified, logicalBytes: 256 * 1024 ** 2 });
    }
    const totalLogicalBytes = entries.reduce((total, entry) => total + entry.logicalBytes, 0);
    const overAge = entries.filter((entry) => now.getTime() - entry.modified.getTime() > 14 * 24 * 60 * 60 * 1_000);
    assert.ok(totalLogicalBytes > 4 * 1024 ** 3);
    assert.ok(overAge.length > 0);
    assert.equal((await Promise.all(entries.map((entry) => stat(entry.path)))).every((entry) => entry.size === 1024), true);
  } finally {
    await rm(directory, { recursive: true });
  }
});
