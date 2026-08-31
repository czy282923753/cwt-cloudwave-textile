import { createPhaseDAiRunWorkerV1 } from "@/server/ai/phase-d-provider-composition";

async function main(): Promise<void> {
  let worker: ReturnType<typeof createPhaseDAiRunWorkerV1> | undefined;
  let stopPromise: Promise<void> | undefined;
  let stopSignal: "SIGINT" | "SIGTERM" | undefined;
  const stop = (signal: "SIGINT" | "SIGTERM"): void => {
    if (!worker) return;
    stopSignal ??= signal;
    stopPromise ??= worker.stop(signal);
    void stopPromise.catch(() => undefined);
  };
  const onSigint = (): void => stop("SIGINT");
  const onSigterm = (): void => stop("SIGTERM");

  try {
    worker = createPhaseDAiRunWorkerV1();
    process.once("SIGINT", onSigint);
    process.once("SIGTERM", onSigterm);
    await worker.start();
    await worker.join();
    await stopPromise;
  } finally {
    process.off("SIGINT", onSigint);
    process.off("SIGTERM", onSigterm);
    if (worker?.running) await worker.stop(stopSignal ?? "SIGTERM");
    await stopPromise;
  }
}

void main().catch(() => {
  process.stderr.write("AI Worker failed: unavailable.\n");
  process.exitCode = 1;
});
