export function normalizePath(path: string): string {
  const withoutQuery = path.trim().split(/[?#]/, 1)[0] ?? "";
  if (!withoutQuery.startsWith("/")) throw new Error("Paths must be absolute.");
  const collapsed = withoutQuery.replace(/\/{2,}/g, "/");
  if (collapsed === "/") return collapsed;
  return collapsed.replace(/\/$/, "").toLowerCase();
}

export function slugify(value: string): string {
  const slug = value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
  if (!slug) throw new Error("A safe Latin URL slug could not be generated.");
  return slug;
}
