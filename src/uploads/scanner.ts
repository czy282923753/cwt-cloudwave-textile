export interface ScanResult {
  clean: boolean;
  provider: string;
  reference: string;
}

export interface FileScanner {
  scan(bytes: Uint8Array, fileName: string): Promise<ScanResult>;
}

export class ScannerUnavailableError extends Error {
  readonly code = "scanner_unavailable";
  readonly provider: string;
  readonly reference: string;

  constructor(provider: string, reference = "unavailable") {
    super("Malware scanner is unavailable.");
    this.name = "ScannerUnavailableError";
    this.provider = provider;
    this.reference = reference;
  }
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
