import { describe, expect, it } from "vitest";

import { analyticsConsents } from "@/db/schema";
import { createTestDatabase } from "@/test/database";

import {
  ensurePersistedConsent,
  findPersistedConsent,
  updatePersistedConsent,
} from "./consent-service";

describe("server-persisted Analytics Consent", () => {
  it("persists Granted, Denied, and Revoked with optimistic versions", async () => {
    const connection = await createTestDatabase();
    const initial = await ensurePersistedConsent(connection.db, null);
    expect(initial.consent).toMatchObject({ status: "unknown", consentVersion: 0 });
    const granted = await updatePersistedConsent(
      connection.db,
      initial.consent.consentSessionId,
      "granted",
      0,
    );
    expect(granted.status).toBe("granted");
    expect(granted.grantedAt).toBeInstanceOf(Date);
    const revoked = await updatePersistedConsent(
      connection.db,
      initial.consent.consentSessionId,
      "revoked",
      1,
    );
    expect(revoked).toMatchObject({ status: "revoked", consentVersion: 2 });
    expect(revoked.revokedAt).toBeInstanceOf(Date);
    await expect(
      updatePersistedConsent(
        connection.db,
        initial.consent.consentSessionId,
        "granted",
        1,
      ),
    ).rejects.toThrow(/changed/);
    expect(
      await findPersistedConsent(connection.db, initial.consent.consentSessionId),
    ).toMatchObject({ status: "revoked", consentVersion: 2 });
    expect(await connection.db.select().from(analyticsConsents)).toHaveLength(1);
    await connection.close();
  });
});
