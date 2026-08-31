import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
function files(root: string): string[] {
  const output: string[] = [];
  for (const name of readdirSync(root)) {
    const path = join(root, name); const stat = statSync(path);
    if (stat.isDirectory()) output.push(...files(path)); else if (/\.(?:ts|tsx)$/u.test(name) && !/\.test\./u.test(name)) output.push(path);
  }
  return output;
}

describe("Option F shared framework material isolation", () => {
  it("retains host-only strict protected-environment authentication cookies", () => {
    for (const path of ["src/app/api/auth/login/route.ts", "src/app/api/auth/logout/route.ts"]) {
      const source = readFileSync(path, "utf8");
      expect(source).toContain("httpOnly: true");
      expect(source).toContain('sameSite: "strict"');
      expect(source).toContain('path: "/"');
      expect(source).toContain('env.APP_ENV === "production" || env.APP_ENV === "staging"');
      expect(source).not.toMatch(/\bdomain\s*:/u);
    }
  });

  it("has no Production application draftMode authority and every preview resolves a current user", () => {
    const production = files(resolve("src"));
    expect(production.filter((path) => readFileSync(path, "utf8").includes("draftMode("))).toEqual([]);
    for (const path of files(resolve("src/app/(admin-preview)"))) {
      const source = readFileSync(path, "utf8");
      expect(source).toContain("resolveCurrentUser");
      expect(source).toMatch(/if \(!currentUser/u);
    }
  });

  it("pins Next 16.2.12 Origin/Host rejection before Server Action dispatch", () => {
    const nextRoot = dirname(require.resolve("next/package.json"));
    const source = readFileSync(join(nextRoot, "dist/server/app-render/action-handler.js"), "utf8");
    expect(JSON.parse(readFileSync(join(nextRoot, "package.json"), "utf8")).version).toBe("16.2.12");
    expect(source).toContain("x-forwarded-host");
    expect(source).toContain("Invalid Server Actions request");
    expect(source.indexOf("Invalid Server Actions request")).toBeLessThan(source.lastIndexOf("actionMod"));
  });
});
