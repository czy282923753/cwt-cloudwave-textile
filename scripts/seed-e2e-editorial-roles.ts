import { hashPassword } from "../src/auth/password";
import { databaseConnection } from "../src/db/client";
import { users } from "../src/db/schema";

const password = "local-only-role-password";
const roleUsers = [
  ["product-editor@example.test", "TEST Product Editor", "product_editor"],
  ["content-editor@example.test", "TEST Content Editor", "content_editor"],
  ["reviewer@example.test", "TEST Reviewer Publisher", "reviewer_publisher"],
  ["sales@example.test", "TEST Sales", "sales"],
  ["analyst@example.test", "TEST Analyst", "analyst"],
] as const;

async function main(): Promise<void> {
  if (process.env.APP_ENV !== "test" || !process.env.CWT_E2E_TEMP_ROOT) {
    throw new Error("Editorial role fixtures require the isolated E2E environment.");
  }
  try {
    const passwordHash = await hashPassword(password);
    const db = databaseConnection.db;
    for (const [email, displayName, role] of roleUsers) {
      await db.insert(users).values({
        email,
        displayName,
        role,
        passwordHash,
      }).onConflictDoUpdate({
        target: users.email,
        set: { displayName, role, passwordHash, isActive: true, updatedAt: new Date() },
      });
    }
    process.stdout.write(`Editorial role E2E fixtures ready: ${roleUsers.length}.\n`);
  } finally {
    await databaseConnection.close();
  }
}

void main();
