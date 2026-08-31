import { createPhaseDAiRunWorkerV1 } from "@/server/ai/phase-d-provider-composition";

async function main(): Promise<void> {
  const worker = createPhaseDAiRunWorkerV1();
  let stopPromise: Promise<void> | undefined;
  const stop = (signal: "SIGINT" | "SIGTERM"): void => {
    stopPromise ??= worker.stop(signal);
    void stopPromise.catch(() => undefined);
  };

  process.once("SIGINT", () => stop("SIGINT"));
  process.once("SIGTERM", () => stop("SIGTERM"));
  await worker.start();
  await worker.join();
  await stopPromise;
}

void main().catch((error: unknown) => {
  process.stderr.write(`AI Worker failed: ${error instanceof Error ? error.message : "unknown error"}\n`);
  process.exitCode = 1;
});
