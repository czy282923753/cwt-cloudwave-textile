import { createPhaseDAiRunWorkerV1 } from "@/server/ai/phase-d-provider-composition";

const worker = createPhaseDAiRunWorkerV1();
let stopping = false;

async function stop(signal: "SIGINT" | "SIGTERM") {
  if (stopping) return;
  stopping = true;
  await worker.stop(signal);
}

process.once("SIGINT", () => { void stop("SIGINT"); });
process.once("SIGTERM", () => { void stop("SIGTERM"); });

await worker.start();
