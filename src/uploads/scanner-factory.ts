import "server-only";

import { createHash } from "node:crypto";

import { env } from "@/config/env";
import { CloudmersiveFileScanner } from "@/integrations/malware/cloudmersive-file-scanner";

import {
  DevelopmentFileScanner,
  ScannerUnavailableError,
  type FileScanner,
} from "./scanner";

interface ProtectedScannerAuthority {
  configurationFingerprint: string;
  scanner: FileScanner;
}

let protectedScannerAuthority: ProtectedScannerAuthority | undefined;

function processAuthorityUnavailable(reference: string): ScannerUnavailableError {
  return new ScannerUnavailableError("cloudmersive", reference);
}

function protectedConfigurationFingerprint(): string {
  return createHash("sha256")
    .update(JSON.stringify([
      "cloudmersive-file-scanner-module-authority-v1",
      env.APP_ENV,
      env.FILE_SCAN_DRIVER,
      env.FILE_SCAN_ORIGIN,
      env.FILE_SCAN_ACCOUNT_CUSTODY,
      env.FILE_SCAN_API_KEY,
    ]))
    .digest("hex");
}

function protectedFileScanner(): FileScanner {
  const configurationFingerprint = protectedConfigurationFingerprint();
  if (protectedScannerAuthority !== undefined) {
    if (protectedScannerAuthority.configurationFingerprint !== configurationFingerprint) {
      throw processAuthorityUnavailable("cloudmersive:process-configuration-mismatch");
    }
    return protectedScannerAuthority.scanner;
  }
  const scanner = new CloudmersiveFileScanner({
    origin: env.FILE_SCAN_ORIGIN,
    apiKey: env.FILE_SCAN_API_KEY,
  });
  protectedScannerAuthority = Object.freeze({
    configurationFingerprint,
    scanner,
  } satisfies ProtectedScannerAuthority);
  return scanner;
}

export function createFileScanner(): FileScanner {
  if (env.APP_ENV === "production" || env.APP_ENV === "staging") {
    if (env.FILE_SCAN_DRIVER !== "cloudmersive") {
      throw new Error("Protected environments require the Cloudmersive scanner.");
    }
    return protectedFileScanner();
  }
  if (env.FILE_SCAN_DRIVER !== "development") {
    throw new Error("Local and test environments permit only the development scanner composition.");
  }
  return new DevelopmentFileScanner();
}
