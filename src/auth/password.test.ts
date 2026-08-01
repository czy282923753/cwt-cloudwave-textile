import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("uses a salted hash and verifies without storing plaintext", async () => {
    const first = await hashPassword("correct-horse-battery-staple");
    const second = await hashPassword("correct-horse-battery-staple");
    expect(first).not.toBe(second);
    expect(first).not.toContain("correct-horse");
    await expect(
      verifyPassword("correct-horse-battery-staple", first),
    ).resolves.toBe(true);
    await expect(verifyPassword("wrong-password", first)).resolves.toBe(false);
  });
});
