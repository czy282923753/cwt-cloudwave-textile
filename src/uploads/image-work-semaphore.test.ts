import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  IMAGE_WORK_CONCURRENCY,
  IMAGE_WORK_MAX_PENDING,
  runWithImageWorkSemaphore,
} from "./image-derivatives";

describe("one process-local image-work semaphore", () => {
  it("keeps maximumActive at one across concurrent governed entry-point challenges", async () => {
    let active = 0;
    let maximumActive = 0;
    const order: string[] = [];
    const challenge = (name: string) => runWithImageWorkSemaphore(async () => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      order.push(`${name}:start`);
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 5));
      order.push(`${name}:finish`);
      active -= 1;
    });
    await Promise.all([
      challenge("upload-decode"),
      challenge("finalize-derivative"),
      challenge("recovery-image"),
    ]);
    expect(maximumActive).toBe(1);
    expect(order).toEqual([
      "upload-decode:start", "upload-decode:finish",
      "finalize-derivative:start", "finalize-derivative:finish",
      "recovery-image:start", "recovery-image:finish",
    ]);
    expect(IMAGE_WORK_CONCURRENCY).toBe(1);
    expect(IMAGE_WORK_MAX_PENDING).toBe(8);
  });

  it("rejects work beyond the bounded pending capacity", async () => {
    let release: (() => void) | undefined;
    const blocker = runWithImageWorkSemaphore(() => new Promise<void>((resolveBlocker) => { release = resolveBlocker; }));
    const queued = Array.from({ length: IMAGE_WORK_MAX_PENDING }, () => runWithImageWorkSemaphore(async () => undefined));
    await expect(runWithImageWorkSemaphore(async () => undefined)).rejects.toThrow(/temporarily at capacity/u);
    release?.();
    await blocker;
    await Promise.all(queued);
  });

  it("releases after failure and never replays an operation", async () => {
    let attempts = 0;
    await expect(runWithImageWorkSemaphore(async () => {
      attempts += 1;
      throw new Error("synthetic image failure");
    })).rejects.toThrow(/synthetic image failure/u);
    await expect(runWithImageWorkSemaphore(async () => {
      attempts += 1;
      return "next";
    })).resolves.toBe("next");
    expect(attempts).toBe(2);
  });

  it("hands the permit directly to queued work without allowing a new caller to barge", async () => {
    let releaseFirst: (() => void) | undefined;
    const order: string[] = [];
    const first = runWithImageWorkSemaphore(async () => {
      order.push("first:start");
      await new Promise<void>((resolveFirst) => { releaseFirst = resolveFirst; });
      order.push("first:finish");
    });
    const queued = runWithImageWorkSemaphore(async () => {
      order.push("queued:start");
      await Promise.resolve();
      order.push("queued:finish");
    });
    await Promise.resolve();
    releaseFirst?.();
    const newcomer = runWithImageWorkSemaphore(async () => {
      order.push("newcomer:start");
      order.push("newcomer:finish");
    });
    await Promise.all([first, queued, newcomer]);
    expect(order).toEqual([
      "first:start", "first:finish",
      "queued:start", "queued:finish",
      "newcomer:start", "newcomer:finish",
    ]);
  });

  it("shows all production Sharp entry points converge and AI text concurrency remains two", async () => {
    const root = process.cwd();
    const [validation, derivatives, repository] = await Promise.all([
      readFile(resolve(root, "src/uploads/file-validation.ts"), "utf8"),
      readFile(resolve(root, "src/uploads/image-derivatives.ts"), "utf8"),
      readFile(resolve(root, "src/ai/runs/repository.ts"), "utf8"),
    ]);
    expect(validation).toContain("runWithImageWorkSemaphore");
    expect(derivatives).toContain("return runWithImageWorkSemaphore");
    expect(repository).toContain("textConcurrencyLimit: 2");
    const sharpSources = [validation, derivatives];
    expect(sharpSources.every((source) => source.includes("runWithImageWorkSemaphore"))).toBe(true);
    expect(sharpSources.some((source) => /Promise\.all\([^)]*(?:sharp|createImageDerivatives)/su.test(source))).toBe(false);
    expect(derivatives).not.toMatch(/declare global|globalThis|Symbol\.for|process\.[A-Za-z_$][\w$]*\s*=/u);
  });
});
