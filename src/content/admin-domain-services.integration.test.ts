import { count, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { createAuthor, updateAuthor } from "@/content/author-service";
import { createCompanyFact, verifyCompanyFact } from "@/content/company-facts-service";
import { assignContactOrganization, createOrganization } from "@/crm/contact-service";
import { auditLogs, authors, companyFacts, contacts, featureFlags, organizations, users } from "@/db/schema";
import { setFeatureFlag } from "@/settings/feature-flag-service";
import { createTestDatabase } from "@/test/database";

const failingAudit = async (): Promise<string> => { throw new Error("TEST audit failure"); };

describe("admin mutation Domain Services", () => {
  it("atomically creates and updates Authors and rechecks permission", async () => {
    const connection = await createTestDatabase();
    try {
      const rows = await connection.db.insert(users).values([
        { email: "author-editor@example.test", displayName: "Author Editor", role: "content_editor", passwordHash: "test" },
        { email: "author-analyst@example.test", displayName: "Analyst", role: "analyst", passwordHash: "test" },
      ]).returning({ id: users.id, role: users.role });
      const editor = rows.find((row) => row.role === "content_editor")!;
      const analyst = rows.find((row) => row.role === "analyst")!;
      await expect(createAuthor(connection.db, { userId: analyst.id, role: analyst.role }, {
        internalKey: "forbidden", displayName: "Forbidden", isOrganization: false,
      })).rejects.toThrow(/permission/i);
      await expect(createAuthor(connection.db, { userId: editor.id, role: editor.role }, {
        internalKey: "rollback-author", displayName: "Rollback", isOrganization: false,
      }, { auditWriter: failingAudit })).rejects.toThrow("TEST audit failure");
      expect(await connection.db.select().from(authors).where(eq(authors.internalKey, "rollback-author"))).toHaveLength(0);
      const id = await createAuthor(connection.db, { userId: editor.id, role: editor.role }, {
        internalKey: "test-author", displayName: "Test Author", isOrganization: false,
      });
      await expect(updateAuthor(connection.db, { userId: editor.id, role: editor.role }, id, {
        displayName: "Must Roll Back", isOrganization: false, isActive: false,
      }, { auditWriter: failingAudit })).rejects.toThrow("TEST audit failure");
      expect((await connection.db.select().from(authors).where(eq(authors.id, id)))[0]).toMatchObject({ displayName: "Test Author", isActive: true });
      await updateAuthor(connection.db, { userId: editor.id, role: editor.role }, id, {
        displayName: "Updated Author", isOrganization: true, isActive: true,
      });
      expect((await connection.db.select().from(authors).where(eq(authors.id, id)))[0]).toMatchObject({ displayName: "Updated Author", isOrganization: true });
    } finally { await connection.close(); }
  });

  it("atomically creates and reviews Company Facts", async () => {
    const connection = await createTestDatabase();
    try {
      const [admin] = await connection.db.insert(users).values({ email: "facts-admin@example.test", displayName: "Facts Admin", role: "admin", passwordHash: "test" }).returning({ id: users.id, role: users.role });
      if (!admin) throw new Error("Missing Admin.");
      await expect(createCompanyFact(connection.db, { userId: admin.id, role: admin.role }, {
        factKey: "rollback", subject: "TEST", statement: "Must not persist",
      }, { auditWriter: failingAudit })).rejects.toThrow("TEST audit failure");
      expect(await connection.db.select().from(companyFacts).where(eq(companyFacts.factKey, "rollback"))).toHaveLength(0);
      const id = await createCompanyFact(connection.db, { userId: admin.id, role: admin.role }, {
        factKey: "verified-test", subject: "TEST Company Fact", statement: "Synthetic fact only",
      });
      await expect(verifyCompanyFact(connection.db, { userId: admin.id, role: admin.role }, id, {
        evidenceReference: "TEST evidence", publicUseAllowed: true,
      }, { auditWriter: failingAudit })).rejects.toThrow("TEST audit failure");
      expect((await connection.db.select().from(companyFacts).where(eq(companyFacts.id, id)))[0]).toMatchObject({ verificationStatus: "provided", publicUseAllowed: false });
      await verifyCompanyFact(connection.db, { userId: admin.id, role: admin.role }, id, { evidenceReference: "TEST evidence", publicUseAllowed: false });
      expect((await connection.db.select().from(companyFacts).where(eq(companyFacts.id, id)))[0]).toMatchObject({ verificationStatus: "verified", publicUseAllowed: false, verifiedByUserId: admin.id });
    } finally { await connection.close(); }
  });

  it("atomically writes Organizations, Contact assignments, Feature Flags, and Audit Logs", async () => {
    const connection = await createTestDatabase();
    try {
      const [admin] = await connection.db.insert(users).values({ email: "domain-admin@example.test", displayName: "Domain Admin", role: "admin", passwordHash: "test" }).returning({ id: users.id, role: users.role });
      if (!admin) throw new Error("Missing Admin.");
      await expect(createOrganization(connection.db, { userId: admin.id, role: admin.role }, { name: "Rollback Org" }, { auditWriter: failingAudit })).rejects.toThrow("TEST audit failure");
      expect(await connection.db.select().from(organizations).where(eq(organizations.name, "Rollback Org"))).toHaveLength(0);
      const organizationId = await createOrganization(connection.db, { userId: admin.id, role: admin.role }, { name: "TEST Organization" });
      const [contact] = await connection.db.insert(contacts).values({ name: "TEST Contact", email: "contact@example.test", normalizedEmail: "contact@example.test" }).returning({ id: contacts.id });
      if (!contact) throw new Error("Missing Contact.");
      await expect(assignContactOrganization(connection.db, { userId: admin.id, role: admin.role }, contact.id, organizationId, { auditWriter: failingAudit })).rejects.toThrow("TEST audit failure");
      expect((await connection.db.select().from(contacts).where(eq(contacts.id, contact.id)))[0]?.organizationId).toBeNull();
      await assignContactOrganization(connection.db, { userId: admin.id, role: admin.role }, contact.id, organizationId);
      const [flag] = await connection.db.insert(featureFlags).values({ key: "domain-test", enabled: false }).returning({ id: featureFlags.id });
      if (!flag) throw new Error("Missing flag.");
      await expect(setFeatureFlag(connection.db, { userId: admin.id, role: admin.role }, flag.id, true, { auditWriter: failingAudit })).rejects.toThrow("TEST audit failure");
      expect((await connection.db.select().from(featureFlags).where(eq(featureFlags.id, flag.id)))[0]?.enabled).toBe(false);
      await setFeatureFlag(connection.db, { userId: admin.id, role: admin.role }, flag.id, true);
      expect(Number((await connection.db.select({ value: count() }).from(auditLogs))[0]!.value)).toBeGreaterThanOrEqual(3);
    } finally { await connection.close(); }
  });
});
