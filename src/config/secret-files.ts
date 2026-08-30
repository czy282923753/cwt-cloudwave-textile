import { lstatSync, readFileSync } from "node:fs";
import { basename, dirname, isAbsolute, normalize } from "node:path";

export const DOCKER_SECRETS_ROOT = "/run/secrets";

export type ProtectedEnvironment = "production" | "staging";

export interface SecretFileReader {
  read(path: string): string;
}

const nodeSecretFileReader: SecretFileReader = {
  read(path) {
    const metadata = lstatSync(path);
    if (!metadata.isFile() || metadata.isSymbolicLink()) {
      throw new Error("Secret file must be a regular non-symlink file.");
    }
    return readFileSync(path, "utf8");
  },
};

export function assertProtectedSecretPath(
  environment: ProtectedEnvironment,
  path: string,
): void {
  const normalized = normalize(path);
  if (
    !isAbsolute(path) ||
    normalized !== path ||
    dirname(path) !== DOCKER_SECRETS_ROOT ||
    !basename(path).startsWith(`${environment}-`) ||
    basename(path).includes("..")
  ) {
    throw new Error(
      `Protected ${environment} secret files must use an environment-prefixed path under ${DOCKER_SECRETS_ROOT}.`,
    );
  }
}

export function readProtectedSecret(input: {
  readonly environment: ProtectedEnvironment;
  readonly field: string;
  readonly literal: string;
  readonly file: string;
  readonly minimumLength?: number;
  readonly reader?: SecretFileReader;
}): string {
  if (input.literal.length > 0) {
    throw new Error(
      `Protected ${input.environment} configuration refuses literal ${input.field}.`,
    );
  }
  if (input.file.length === 0) {
    throw new Error(
      `Protected ${input.environment} configuration requires ${input.field}_FILE.`,
    );
  }
  assertProtectedSecretPath(input.environment, input.file);
  let value: string;
  try {
    value = (input.reader ?? nodeSecretFileReader).read(input.file);
  } catch {
    throw new Error(`Protected ${input.environment} secret file is unreadable.`);
  }
  const trimmed = value.endsWith("\n") ? value.slice(0, -1) : value;
  if (
    trimmed.length < (input.minimumLength ?? 1) ||
    trimmed !== trimmed.trim() ||
    /[\r\n\u0000]/u.test(trimmed)
  ) {
    throw new Error(`Protected ${input.environment} secret file has an invalid value.`);
  }
  return trimmed;
}
