/**
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *	http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Define the severity levels for log messages.
export type LogSeverity = 'debug' | 'info' | 'warn' | 'error';

// Maps severity strings to numerical levels for filtering.
const SeverityLevels: Record<LogSeverity, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Represents a single log record.
 */
export interface LogRecord {
  timestamp: string;
  severity: LogSeverity;
  message: string;
  context?: Record<string, unknown>;
  error?: Error | undefined;
}

/**
 * A flexible logger for recording application events.
 */
export class Logger {
  private minSeverity: number;
  private metadata: Record<string, unknown> = {};

  constructor() {
    const envSeverity = process.env['LOG_LEVEL']?.toLowerCase() as LogSeverity;
    this.minSeverity = SeverityLevels[envSeverity] ?? SeverityLevels.info;
  }

  withContext(data: Record<string, unknown>): Logger {
    const newLogger = Object.create(this);
    newLogger.metadata = { ...this.metadata, ...data };
    return newLogger;
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.write('debug', message, data);
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.write('info', message, data);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.write('warn', message, data);
  }

  error(message: string, error?: Error, data?: Record<string, unknown>): void {
    this.write('error', message, data, error);
  }

  private write(
    severity: LogSeverity,
    message: string,
    context?: Record<string, unknown>,
    error?: Error,
  ): void {
    if (SeverityLevels[severity] < this.minSeverity) {
      return;
    }

    const record: LogRecord = {
      timestamp: new Date().toISOString(),
      severity,
      message,
      context: { ...this.metadata, ...context },
      error,
    };

    const contextString =
      record.context && Object.keys(record.context).length > 0
        ? ` | ${JSON.stringify(record.context)}`
        : '';

    const errorString = error ? ` | Message: ${error.message}` : '';

    const formattedMessage = `[${record.timestamp}] ${record.severity.toUpperCase()}: ${message}${contextString}${errorString}`;

    // Use console.error for all levels to ensure MCP server logs are captured
    console.error(formattedMessage);

    if (error?.stack) {
      console.error('Stack trace:', error.stack);
    }
  }

  startTimer(operation: string): () => void {
    const startTime = performance.now();
    return () => {
      const duration = performance.now() - startTime;
      this.info(`Operation completed`, {
        operation,
        duration: `${duration.toFixed(2)}ms`,
      });
    };
  }

  mcpTool(toolName: string, input?: unknown): Logger {
    return this.withContext({
      tool: toolName,
      input,
    });
  }
}

// Export a default logger instance for convenience.
export const logger = new Logger();

// Export a collection of convenience functions for easy access.
export const log = {
  debug: logger.debug.bind(logger),
  info: logger.info.bind(logger),
  warn: logger.warn.bind(logger),
  error: logger.error.bind(logger),
  timer: logger.startTimer.bind(logger),
  mcp: logger.mcpTool.bind(logger),
};
