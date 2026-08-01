export const roles = [
  "admin",
  "product_editor",
  "content_editor",
  "reviewer_publisher",
  "sales",
  "analyst",
] as const;

export type UserRole = (typeof roles)[number];

export const permissions = [
  "admin.access",
  "users.manage",
  "settings.manage",
  "assets.read",
  "assets.write",
  "assets.declaration.review",
  "products.read",
  "products.write",
  "products.review",
  "products.publish",
  "taxonomy.manage",
  "content.read",
  "content.write",
  "content.review",
  "content.publish",
  "seo.manage",
  "company_facts.manage",
  "inquiries.read",
  "inquiries.write",
  "crm.manage",
  "analytics.read",
  "audit.read",
] as const;

export type Permission = (typeof permissions)[number];

const rolePermissionMatrix: Readonly<Record<UserRole, ReadonlySet<Permission>>> = {
  admin: new Set(permissions),
  product_editor: new Set([
    "admin.access",
    "assets.read",
    "assets.write",
    "products.read",
    "products.write",
    "taxonomy.manage",
    "content.read",
  ]),
  content_editor: new Set([
    "admin.access",
    "assets.read",
    "assets.write",
    "products.read",
    "content.read",
    "content.write",
  ]),
  reviewer_publisher: new Set([
    "admin.access",
    "assets.read",
    "assets.declaration.review",
    "products.read",
    "products.review",
    "products.publish",
    "content.read",
    "content.review",
    "content.publish",
    "seo.manage",
    "company_facts.manage",
    "audit.read",
  ]),
  sales: new Set([
    "admin.access",
    "assets.read",
    "products.read",
    "inquiries.read",
    "inquiries.write",
    "crm.manage",
  ]),
  analyst: new Set([
    "admin.access",
    "products.read",
    "content.read",
    "inquiries.read",
    "analytics.read",
  ]),
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return rolePermissionMatrix[role].has(permission);
}

export function requirePermission(role: UserRole, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw new AuthorizationError(role, permission);
  }
}

export class AuthorizationError extends Error {
  constructor(
    public readonly role: UserRole,
    public readonly permission: Permission,
  ) {
    super(`Role ${role} does not have permission ${permission}.`);
    this.name = "AuthorizationError";
  }
}
