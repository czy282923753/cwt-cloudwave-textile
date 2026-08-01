import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CWT Operations Sign In",
  robots: { index: false, follow: false },
};

export default async function OperationsLoginPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ error?: string }> }>) {
  const { error } = await searchParams;
  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 p-6 text-slate-100">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-8 shadow-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-300">
          CloudWave Textile
        </p>
        <h1 className="mt-3 text-3xl font-semibold">Operations sign in</h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          Authorized CWT operators only. Local credentials are development fixtures.
        </p>
        {error ? (
          <p className="mt-5 rounded-xl border border-red-400/30 bg-red-950/40 p-3 text-sm text-red-200">
            Sign-in was not accepted. Check the credentials and try again.
          </p>
        ) : null}
        <form action="/api/auth/login" className="mt-7 grid gap-5" method="post">
          <label className="grid gap-2 text-sm font-medium">
            Email
            <input
              autoComplete="username"
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-teal-400"
              name="email"
              required
              type="email"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Password
            <input
              autoComplete="current-password"
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-teal-400"
              name="password"
              required
              type="password"
            />
          </label>
          <button
            className="rounded-xl bg-teal-400 px-5 py-3 font-semibold text-slate-950 hover:bg-teal-300"
            type="submit"
          >
            Sign in
          </button>
        </form>
      </section>
    </main>
  );
}
