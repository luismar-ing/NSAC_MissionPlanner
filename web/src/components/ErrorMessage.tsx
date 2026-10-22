import type { ErrorInfo } from "../lib/errors";
import { STRINGS } from "../lib/strings";

/** An error state (T5.2.b): what failed, the technical detail in smaller text, and a retry when it can help. */
export function ErrorMessage({ what, info, onRetry }: { what: string; info: ErrorInfo; onRetry?: () => void }) {
  return (
    <div className="error-message" role="alert" data-testid="error-message">
      <p>
        <strong>{what}</strong> {info.message}
      </p>
      <p className="error-detail">{info.detail}</p>
      {info.retryable && onRetry && (
        <button type="button" className="btn" onClick={onRetry}>
          {STRINGS.errors.retry}
        </button>
      )}
    </div>
  );
}
