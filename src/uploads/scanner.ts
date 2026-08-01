import { env } from "@/config/env";

export interface ScanResult {
  clean: boolean;
  provider: string;
  reference: string;
}

export interface FileScanner {
  scan(bytes: Uint8Array, fileName: string): Promise<ScanResult>;
}

export class DevelopmentFileScanner implements FileScanner {
  async scan(bytes: Uint8Array, fileName: string): Promise<ScanResult> {
    const eicarMarker = "EICAR-STANDARD-ANTIVIRUS-TEST-FILE";
    const clean = !Buffer.from(bytes).toString("latin1").includes(eicarMarker);
    return {
      clean,
      provider: "development-eicar-adapter",
      reference: `development:${fileName}`,
    };
  }
}

export class HttpFileScanner implements FileScanner {
  async scan(bytes: Uint8Array, fileName: string): Promise<ScanResult> {
    if (!env.FILE_SCAN_ENDPOINT) {
      throw new Error("File scan endpoint is required for the HTTP scanner.");
    }
    const response = await fetch(env.FILE_SCAN_ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/octet-stream",
        "x-file-name": encodeURIComponent(fileName),
        ...(env.FILE_SCAN_TOKEN
          ? { authorization: `Bearer ${env.FILE_SCAN_TOKEN}` }
          : {}),
      },
      body: Buffer.from(bytes),
    });
    if (!response.ok) {
      throw new Error(`File scanner failed with status ${response.status}.`);
    }
    const result = (await response.json()) as unknown;
    if (
      typeof result !== "object" ||
      result === null ||
      !("clean" in result) ||
      typeof result.clean !== "boolean"
    ) {
      throw new Error("File scanner returned an invalid response.");
    }
    const reference =
      "reference" in result && typeof result.reference === "string"
        ? result.reference
        : "unavailable";
    return { clean: result.clean, provider: "http", reference };
  }
}

export function createFileScanner(): FileScanner {
  return env.FILE_SCAN_DRIVER === "http"
    ? new HttpFileScanner()
    : new DevelopmentFileScanner();
}
