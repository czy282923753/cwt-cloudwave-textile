import { runControlledDeepSeekValidationV1 } from "@/ai/testing/controlled-provider-validation";

async function main(): Promise<void> {
  const result = await runControlledDeepSeekValidationV1();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.status !== "PASS") process.exitCode = 1;
}

void main();
