import { requireCurrentUser } from "@/auth/current-user";
import type { Actor } from "@/catalog/product-service";

export async function currentActor(): Promise<Actor> {
  const user = await requireCurrentUser("admin.access");
  return { userId: user.id, role: user.role };
}
