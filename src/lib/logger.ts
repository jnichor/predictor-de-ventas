/**
 * Logger estructurado para server-side (API routes).
 *
 * Output: JSON por línea, que se lee bien en Vercel Logs y se puede parsear
 * con herramientas tipo Logflare, Axiom, Datadog.
 *
 * Uso:
 *   logInfo('sale created', { saleId, userId });
 *   logError('sale creation failed', error, { barcode, quantity });
 *
 * NOTA: en producción real, esto se conecta a un servicio de error tracking
 * (Sentry, LogRocket, etc.) reemplazando el console.log por la API del servicio.
 */

type LogContext = Record<string, unknown>;

type LogEntry = {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
};

function serialize(entry: LogEntry): string {
  return JSON.stringify(entry);
}

export function logInfo(message: string, context?: LogContext): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: 'info',
    message,
    ...(context ? { context } : {}),
  };
  // eslint-disable-next-line no-console
  console.log(serialize(entry));
}

export function logWarn(message: string, context?: LogContext): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: 'warn',
    message,
    ...(context ? { context } : {}),
  };
  // eslint-disable-next-line no-console
  console.warn(serialize(entry));
}

export function logError(
  message: string,
  error?: unknown,
  context?: LogContext,
): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: 'error',
    message,
    ...(context ? { context } : {}),
  };

  if (error instanceof Error) {
    entry.error = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  } else if (error != null) {
    entry.error = {
      name: 'UnknownError',
      message: String(error),
    };
  }

  // eslint-disable-next-line no-console
  console.error(serialize(entry));
}
