// ==================================================
// Application Error System
// ==================================================
// Structured, typed error codes for the entire platform.
// Every error has a unique code for tracing and debugging.

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface AppErrorOptions {
  /** Unique error code, e.g. AUTH_001_UNAUTHENTICATED */
  code: string;
  /** Human-readable message */
  message: string;
  /** HTTP status code */
  statusCode: number;
  /** Error severity for logging/alerting */
  severity?: ErrorSeverity;
  /** Additional context for debugging (never sent to client) */
  context?: Record<string, unknown>;
  /** Original error */
  cause?: unknown;
}

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly severity: ErrorSeverity;
  public readonly context: Record<string, unknown>;
  public readonly timestamp: string;

  constructor(options: AppErrorOptions) {
    super(options.message);
    this.name = 'AppError';
    this.code = options.code;
    this.statusCode = options.statusCode;
    this.severity = options.severity ?? 'medium';
    this.context = options.context ?? {};
    this.timestamp = new Date().toISOString();

    if (options.cause) {
      this.cause = options.cause;
    }

    // Maintain stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  /**
   * Safe serialization for API responses.
   * Never includes internal context or stack traces.
   */
  toClientResponse(): {
    error: { code: string; message: string; statusCode: number };
  } {
    return {
      error: {
        code: this.code,
        message: this.message,
        statusCode: this.statusCode,
      },
    };
  }

  /**
   * Full serialization for logging.
   * Includes context but NOT stack traces with source paths.
   */
  toLogEntry(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      severity: this.severity,
      context: this.context,
      timestamp: this.timestamp,
    };
  }
}
