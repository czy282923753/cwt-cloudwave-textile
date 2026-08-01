import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("public bundle checker", () => {
  it("fails clearly when no fresh production build exists", () => {
    const result = spawnSync(process.execPath, ["scripts/check-public-bundle.mjs"], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: { ...process.env, CWT_BUILD_DIR: ".definitely-missing-build" },
    });
    expect(result.status).not.toBe(0);
    expect(`${result.stdout}${result.stderr}`).toMatch(/requires a fresh production build/i);
  });
});
