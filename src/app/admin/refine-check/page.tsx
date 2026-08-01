const checks = [
  "Next.js App Router route ownership remains in the application",
  "Refine is loaded only inside the admin layout",
  "Server authorization remains outside the Refine provider",
  "Product long forms and relationship workflows remain custom",
  "Public rendering has no dependency on Refine",
];

export default function RefineCompatibilityPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-300">
          Internal compatibility check
        </p>
        <h1 className="mt-4 text-4xl font-semibold">Refine v5 boundary</h1>
        <p className="mt-4 max-w-2xl text-slate-300">
          This route validates Refine as an admin-only navigation and simple
          CRUD shell. Domain workflows remain server-owned.
        </p>
        <ul className="mt-10 grid gap-3">
          {checks.map((check) => (
            <li
              className="rounded-xl border border-slate-800 bg-slate-900 p-4"
              key={check}
            >
              {check}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
