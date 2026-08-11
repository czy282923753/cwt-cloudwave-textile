import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";

describe("database client global cache", () => {
  it("reuses the same non-production connection across fresh module evaluation", async () => {
    const first = await import("./client");
    expect(globalThis.cwtDatabaseConnection).toBe(first.databaseConnection);

    vi.resetModules();
    const second = await import("./client");

    expect(second.databaseConnection).toBe(first.databaseConnection);
    expect(globalThis.cwtDatabaseConnection).toBe(first.databaseConnection);
  });

  it("uses only direct named globalThis cache access at the V3.1 boundary", () => {
    const path = resolve(process.cwd(), "src/db/client.ts");
    const source = ts.createSourceFile(
      path,
      readFileSync(path, "utf8"),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const directCacheAccesses: ts.PropertyAccessExpression[] = [];
    const capturedGlobalObjects: ts.Node[] = [];

    const visit = (node: ts.Node): void => {
      if (ts.isIdentifier(node) && node.text === "globalThis") {
        const parent = node.parent;
        if (ts.isPropertyAccessExpression(parent) && parent.expression === node &&
          parent.name.text === "cwtDatabaseConnection" && parent.questionDotToken === undefined) {
          directCacheAccesses.push(parent);
        } else {
          capturedGlobalObjects.push(node);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);

    expect(capturedGlobalObjects).toEqual([]);
    expect(directCacheAccesses).toHaveLength(2);
    expect(directCacheAccesses.every((access) =>
      !ts.isElementAccessExpression(access.parent))).toBe(true);

    const cacheWrite = directCacheAccesses.find((access) =>
      ts.isBinaryExpression(access.parent) && access.parent.left === access &&
      access.parent.operatorToken.kind === ts.SyntaxKind.EqualsToken);
    expect(cacheWrite).toBeDefined();
    expect(cacheWrite?.parent.parent.parent.parent).toMatchObject({
      kind: ts.SyntaxKind.IfStatement,
    });
    const writeGuard = cacheWrite?.parent.parent.parent.parent;
    expect(writeGuard !== undefined && ts.isIfStatement(writeGuard) &&
      ts.isBinaryExpression(writeGuard.expression) &&
      writeGuard.expression.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsEqualsToken &&
      ts.isPropertyAccessExpression(writeGuard.expression.left) &&
      ts.isIdentifier(writeGuard.expression.left.expression) &&
      writeGuard.expression.left.expression.text === "env" &&
      writeGuard.expression.left.name.text === "APP_ENV" &&
      ts.isStringLiteral(writeGuard.expression.right) &&
      writeGuard.expression.right.text === "production").toBe(true);
  });
});
