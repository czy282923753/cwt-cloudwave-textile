import "server-only";

import { env } from "@/config/env";
import { CloudmersiveFileScanner } from "@/integrations/malware/cloudmersive-file-scanner";

import { DevelopmentFileScanner, type FileScanner } from "./scanner";

export function createFileScanner(): FileScanner {
  if (env.APP_ENV === "production" || env.APP_ENV === "staging") {
    if (env.FILE_SCAN_DRIVER !== "cloudmersive") {
      throw new Error("Protected environments require the Cloudmersive scanner.");
    }
    return new CloudmersiveFileScanner({
      origin: env.FILE_SCAN_ORIGIN,
      apiKey: env.FILE_SCAN_API_KEY,
    });
  }
  if (env.FILE_SCAN_DRIVER !== "development") {
    throw new Error("Local and test environments permit only the development scanner composition.");
  }
  return new DevelopmentFileScanner();
}
