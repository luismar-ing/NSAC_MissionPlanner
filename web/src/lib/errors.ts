/**
 * User-facing description of a failure (T5.2.b): says WHAT could not be loaded and WHAT to do, and keeps the
 * technical detail (file, reason) for whoever reports it. Network failures invite a retry; broken data files
 * do not (a retry would fail the same way).
 */
import { DataError } from "./data";
import { STRINGS } from "./strings";

export interface ErrorInfo {
  message: string;
  detail: string;
  retryable: boolean;
}

export function describeError(e: unknown): ErrorInfo {
  if (e instanceof DataError) {
    if (e.kind === "network") return { message: STRINGS.errors.network, detail: e.message, retryable: true };
    return { message: STRINGS.errors.data, detail: e.message, retryable: false };
  }
  const detail = e instanceof Error ? e.message : String(e);
  return { message: STRINGS.errors.unexpected, detail, retryable: true };
}
