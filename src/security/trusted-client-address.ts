import { isIP } from "node:net";

export const TRUSTED_CLIENT_ADDRESS_HEADER = "x-cwt-client-address";

export type TrustedClientAddressResult =
  | Readonly<{ kind: "trusted"; address: string }>
  | Readonly<{ kind: "unavailable" }>;

function normalizeAddress(value: string): string | null {
  if (value !== value.trim() || value.length === 0 || value.length > 64 || value.includes("%")) return null;
  const version = isIP(value);
  if (version === 4) return value;
  if (version !== 6) return null;
  try {
    return new URL(`http://[${value}]/`).hostname.slice(1, -1).toLowerCase();
  } catch {
    return null;
  }
}

export function trustedClientAddressFromRequest(
  request: Request,
  testSeam: Readonly<{ syntheticAddress?: string }> = {},
): TrustedClientAddressResult {
  const candidate = testSeam.syntheticAddress ?? request.headers.get(TRUSTED_CLIENT_ADDRESS_HEADER);
  if (candidate === null || candidate === undefined) return Object.freeze({ kind: "unavailable" });
  const address = normalizeAddress(candidate);
  return address === null
    ? Object.freeze({ kind: "unavailable" })
    : Object.freeze({ kind: "trusted", address });
}
