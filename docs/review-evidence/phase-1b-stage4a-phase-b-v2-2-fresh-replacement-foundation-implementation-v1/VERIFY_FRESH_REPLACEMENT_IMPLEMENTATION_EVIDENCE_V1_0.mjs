import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const evidenceRoot = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = realpathSync(resolve(evidenceRoot, "../../../"));
const authorityPath = join(evidenceRoot, "FRESH_REPLACEMENT_IMPLEMENTATION_AUTHORITY_V1_0.json");
const manifestPath = join(evidenceRoot, "FRESH_REPLACEMENT_IMPLEMENTATION_MANIFEST_V1_0.json");
const expectedCodeHead = "4ce25e422b79bda62d0489d906e3e871a6279af9";

function fail(message) {
  throw new Error(`Fresh replacement implementation evidence failed closed: ${message}`);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function canonical(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  }
  fail("non-JCS JSON value");
}

function git(args) {
  return execFileSync("git", args, { cwd: repositoryRoot, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

const authorityBytes = readFileSync(authorityPath);
const manifestBytes = readFileSync(manifestPath);
const authority = JSON.parse(authorityBytes);
const manifest = JSON.parse(manifestBytes);
if (!authorityBytes.equals(Buffer.from(`${canonical(authority)}\n`))) fail("authority is not exact canonical JSON");
if (!manifestBytes.equals(Buffer.from(`${canonical(manifest)}\n`))) fail("manifest is not exact canonical JSON");
if (authority.status !== "CANDIDATE_IMPLEMENTATION_COMPLETE_REVIEW_REQUIRED") fail("authority status");
if (authority.finalCode.head !== expectedCodeHead || manifest.finalCodeHead !== expectedCodeHead) fail("final code identity");
if (authority.acceptanceClaim !== false || authority.independentReviewRequired !== true) fail("review boundary");

const manifestRelative = manifestPath.slice(repositoryRoot.length + 1).split(sep).join("/");
const seen = new Set();
for (const entry of manifest.entries) {
  if (seen.has(entry.path)) fail(`duplicate manifest path ${entry.path}`);
  seen.add(entry.path);
  const path = resolve(repositoryRoot, entry.path);
  if (!path.startsWith(`${repositoryRoot}${sep}`) || realpathSync(path) !== path) fail(`physical path identity ${entry.path}`);
  const bytes = readFileSync(path);
  if (bytes.length !== entry.bytes || sha256(bytes) !== entry.sha256) fail(`hash or byte mismatch ${entry.path}`);
  if (git(["ls-files", "--error-unmatch", entry.path]) !== entry.path) fail(`untracked evidence ${entry.path}`);
}
const report = manifest.nonAuthoritativeReport;
const reportPath = resolve(repositoryRoot, report.path);
if (!reportPath.startsWith(`${repositoryRoot}${sep}`) || realpathSync(reportPath) !== reportPath) {
  fail("report physical path identity");
}
const reportBytes = readFileSync(reportPath);
if (reportBytes.length !== report.bytes || sha256(reportBytes) !== report.sha256) fail("report hash or byte mismatch");
if (git(["ls-files", "--error-unmatch", report.path]) !== report.path) fail("untracked report");
if (seen.has(manifestRelative)) fail("manifest must not self-hash");
const trackedEvidence = git(["ls-files", "--", manifest.root]).split("\n").filter(Boolean).sort();
const expectedTracked = [...seen, manifestRelative].sort();
if (JSON.stringify(trackedEvidence) !== JSON.stringify(expectedTracked)) fail("tracked evidence membership differs from manifest plus manifest");

for (const checkpoint of authority.checkpoints) {
  if (git(["rev-parse", "--verify", checkpoint.ref]) !== checkpoint.commit) fail(`checkpoint moved ${checkpoint.ref}`);
}
if (git(["rev-parse", `${expectedCodeHead}^`]) !== authority.finalCode.parent) fail("final code parent");
if (git(["rev-parse", `${expectedCodeHead}^{tree}`]) !== authority.finalCode.tree) fail("final code tree");
if (git(["merge-base", "--is-ancestor", authority.acceptedStart.commit, expectedCodeHead]) !== "") fail("unexpected merge-base output");

const changed = git(["diff", "--name-status", authority.acceptedStart.commit, expectedCodeHead]).split("\n").filter(Boolean);
if (sha256(Buffer.from(`${changed.join("\n")}\n`)) !== authority.changedPathNameStatusSha256) fail("changed path aggregate");
const nonDocsAfterCode = git(["diff", "--name-only", expectedCodeHead, "HEAD", "--", ".", ":(exclude)docs/**"]);
if (nonDocsAfterCode !== "") fail("successors after final code HEAD changed non-docs bytes");
if (git(["status", "--porcelain=v1"]) !== "") fail("worktree not clean");

console.log(JSON.stringify({
  ok: true,
  disposition: "IMPLEMENTATION_EVIDENCE_CONSISTENT_NOT_ACCEPTANCE",
  finalCodeHead: expectedCodeHead,
  implementationHead: git(["rev-parse", "HEAD"]),
  authoritySha256: sha256(authorityBytes),
  manifestSha256: sha256(manifestBytes),
  manifestEntries: manifest.entries.length,
  exactCanonicalAuthority: true,
  trackedMembership: true,
  checkpointRefsImmutable: true,
  docsOnlySuccessorsAfterFinalCodeHead: true,
  clean: true
}, null, 2));
