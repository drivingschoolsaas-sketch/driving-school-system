// ==================================================
// Structured Logger
// ==================================================
// Centralized logging with structured context.
// All logs include timestamp, environment, and optional
// organization/user context for multi-tenant debugging.

import { AppError } from '@/lib/errors/app-error';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  /** Unique request ID for tracing */
  requestId?: string;
  /** Organization ID (tenant context) */
  organizationId?: string;
  /** User ID (sanitized, never includes secrets) */
  userId?: string;
  /** Feature area, e.g. "bookings", "domains" */
  feature?: string;
  /** Operation being performed */
  operation?: string;
  /** Entity type being acted on */
  entityType?: string;
  /** Entity ID */
  entityId?: string;
  /** Operation result */
  result?: string;
  /** Error code if applicable */
  errorCode?: string;
  /** Additional safe metadata */
  [key: string]: unknown;
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  environment: string;
  context: LogContext;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function getMinLevel(): LogLevel {
  const env = process.env.NODE_ENV;
  if (env === 'production') return 'info';
  return 'debug';
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[getMinLevel()];
}

function createEntry(
  level: LogLevel,
  message: string,
  context: LogContext = {}
): LogEntry {
  return {
    level,
    message,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV ?? 'development',
    context,
  };
}

function emit(entry: LogEntry): void {
  const output = JSON.stringify(entry);

  switch (entry.level) {
    case 'error':
      console.error(output);
      break;
    case 'warn':
      console.warn(output);
      break;
    case 'debug':
      console.debug(output);
      break;
    default:
      console.log(output);
  }
}

/**
 * Structured logger for the application.
 * Always use this instead of raw console.log calls.
 */
export const logger = {
  debug(message: string, context?: LogContext): void {
    if (!shouldLog('debug')) return;
    emit(createEntry('debug', message, context));
  },

  info(message: string, context?: LogContext): void {
    if (!shouldLog('info')) return;
    emit(createEntry('info', message, context));
  },

  warn(message: string, context?: LogContext): void {
    if (!shouldLog('warn')) return;
    emit(createEntry('warn', message, context));
  },

  error(message: string, error?: unknown, context?: LogContext): void {
    if (!shouldLog('error')) return;

    const enrichedContext = { ...context };

    if (error instanceof AppError) {
      enrichedContext.errorCode = error.code;
      Object.assign(enrichedContext, error.context);
    } else if (error instanceof Error) {
      enrichedContext.errorMessage = error.message;
    }

    emit(createEntry('error', message, enrichedContext));
  },
} as const;
