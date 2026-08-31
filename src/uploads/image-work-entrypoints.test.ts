import { describe, expect, it, vi } from "vitest";

const tracker = vi.hoisted(() => ({ active: 0, maximumActive: 0, calls: [] as string[] }));

vi.mock("sharp", () => {
  const observed = async <T>(name: string, result: T): Promise<T> => {
    tracker.active += 1;
    tracker.maximumActive = Math.max(tracker.maximumActive, tracker.active);
    tracker.calls.push(`${name}:start`);
    await new Promise((resolve) => setTimeout(resolve, 2));
    tracker.calls.push(`${name}:finish`);
    tracker.active -= 1;
    return result;
  };
  const createPipeline = () => {
    const pipeline = {
      rotate: () => pipeline,
      resize: () => pipeline,
      clone: () => pipeline,
      webp: () => pipeline,
      avif: () => pipeline,
      metadata: () => observed("metadata", { width: 16, height: 12 }),
      toBuffer: (options?: { resolveWithObject?: boolean }) => observed(
        "buffer",
        options?.resolveWithObject
          ? { data: Buffer.from([1, 2, 3]), info: { width: 16, height: 12 } }
          : Buffer.from([1, 2, 3]),
      ),
    };
    return pipeline;
  };
  return { default: () => createPipeline() };
});

import { validateUploadedFile } from "./file-validation";
import { createImageDerivatives } from "./image-derivatives";

describe("governed production image entry points", () => {
  it("share one module-local semaphore across decode and derivative callers", async () => {
    tracker.active = 0;
    tracker.maximumActive = 0;
    tracker.calls.length = 0;
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0x00]);
    const [validated, derivatives] = await Promise.all([
      validateUploadedFile({ bytes: jpeg, declaredMimeType: "image/jpeg", maximumBytes: 1024, purpose: "public_asset" }),
      createImageDerivatives(jpeg),
    ]);
    expect(validated).toEqual({ detectedMimeType: "image/jpeg", width: 16, height: 12 });
    expect(derivatives).toHaveLength(6);
    expect(tracker.maximumActive).toBe(1);
    expect(tracker.calls.filter((entry) => entry.endsWith(":start"))).toHaveLength(8);
  });
});
