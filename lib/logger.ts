type LogLevel = 'info' | 'warn' | 'error';

interface LogContext {
  route?: string;
  userId?: string;
  itemId?: string;
  error?: unknown;
  [key: string]: unknown;
}

export function log(level: LogLevel, message: string, context?: LogContext) {
  const timestamp = new Date().toISOString();
  const entry = {
    timestamp,
    level,
    message,
    ...context,
    error: context?.error instanceof Error
      ? { message: context.error.message, stack: context.error.stack }
      : context?.error,
  };
  if (level === 'error') {
    console.error(JSON.stringify(entry));
  } else if (level === 'warn') {
    console.warn(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}
