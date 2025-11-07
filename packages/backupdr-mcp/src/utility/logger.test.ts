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

/* eslint-disable no-console */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
// Use type-only imports to avoid loading the module at the top level
import type { Logger as LoggerType, log as logType } from './logger.js';

describe('Logger', () => {
  // These will be populated in beforeEach after resetting modules
  let log: typeof logType;
  let logger: LoggerType;

  beforeEach(async () => {
    vi.resetModules();
    const LoggerModule = await import('./logger.js');
    log = LoggerModule.log;
    logger = LoggerModule.logger;

    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    delete process.env['LOG_LEVEL'];
  });

  describe('Context Management', () => {
    test('withContext should create a new logger with extended context', () => {
      const contextualLogger = logger.withContext({ local: 'context' });
      contextualLogger.info('contextual message');
      expect(console.error).toHaveBeenCalledWith(
        '[2025-01-01T00:00:00.000Z] INFO: contextual message | {"local":"context"}',
      );
      // Ensure original logger is not affected
      logger.info('original message');
      expect(console.error).toHaveBeenCalledWith(
        '[2025-01-01T00:00:00.000Z] INFO: original message',
      );
    });
  });

  describe('Logging Levels', () => {
    test('should log debug messages', async () => {
      process.env['LOG_LEVEL'] = 'debug';
      // Re-import to pick up env var change
      vi.resetModules();
      const { logger: debugLogger } = await import('./logger.js');
      debugLogger.debug('debug message');
      expect(console.error).toHaveBeenCalledWith('[2025-01-01T00:00:00.000Z] DEBUG: debug message');
    });

    test('should log info messages', () => {
      logger.info('info message');
      expect(console.error).toHaveBeenCalledWith('[2025-01-01T00:00:00.000Z] INFO: info message');
    });

    test('should log warn messages', () => {
      logger.warn('warn message');
      expect(console.error).toHaveBeenCalledWith('[2025-01-01T00:00:00.000Z] WARN: warn message');
    });

    test('should log error messages with error object', () => {
      const error = new Error('low level err message');
      error.stack = 'stack trace';
      logger.error('high level err message', error);
      expect(console.error).toHaveBeenCalledWith(
        '[2025-01-01T00:00:00.000Z] ERROR: high level err message | Message: low level err message',
      );
      expect(console.error).toHaveBeenCalledWith('Stack trace:', 'stack trace');
    });
  });

  describe('Log Level Filtering', () => {
    test('should not log debug messages if level is info', () => {
      logger.debug('should not appear');
      expect(console.error).not.toHaveBeenCalled();
    });

    test('should log info and above if level is info (default)', () => {
      logger.info('info');
      expect(console.error).toHaveBeenCalledWith('[2025-01-01T00:00:00.000Z] INFO: info');
      logger.warn('warn');
      expect(console.error).toHaveBeenCalledWith('[2025-01-01T00:00:00.000Z] WARN: warn');
      logger.error('error');
      expect(console.error).toHaveBeenCalledWith('[2025-01-01T00:00:00.000Z] ERROR: error');
    });

    test('should only log error if level is error', async () => {
      process.env['LOG_LEVEL'] = 'error';
      vi.resetModules();
      const { logger: errorLogger } = await import('./logger.js');
      errorLogger.debug('debug');
      errorLogger.info('info');
      errorLogger.warn('warn');
      expect(console.error).not.toHaveBeenCalled();
      errorLogger.error('error');
      expect(console.error).toHaveBeenCalledWith('[2025-01-01T00:00:00.000Z] ERROR: error');
    });
  });

  describe('Timer', () => {
    test('startTimer should log the duration', () => {
      const endTimer = logger.startTimer('my-operation');
      vi.advanceTimersByTime(123);
      endTimer();
      expect(console.error).toHaveBeenCalledWith(
        '[2025-01-01T00:00:00.123Z] INFO: Operation completed | {"operation":"my-operation","duration":"123.00ms"}',
      );
    });
  });

  describe('MCP Tool Logger', () => {
    test('mcpTool should create a logger with tool context', () => {
      const toolLogger = logger.mcpTool('gcloud-run', { project: 'my-proj' });
      toolLogger.info('tool execution');
      expect(console.error).toHaveBeenCalledWith(
        '[2025-01-01T00:00:00.000Z] INFO: tool execution | {"tool":"gcloud-run","input":{"project":"my-proj"}}',
      );
    });

    test('mcpTool should handle input with no keys', () => {
      const toolLogger = logger.mcpTool('gcloud-run', {});
      toolLogger.info('tool execution');
      expect(console.error).toHaveBeenCalledWith(
        '[2025-01-01T00:00:00.000Z] INFO: tool execution | {"tool":"gcloud-run","input":{}}',
      );
    });

    test('mcpTool should handle undefined input', () => {
      const toolLogger = logger.mcpTool('gcloud-run');
      toolLogger.info('tool execution');
      expect(console.error).toHaveBeenCalledWith(
        '[2025-01-01T00:00:00.000Z] INFO: tool execution | {"tool":"gcloud-run"}',
      );
    });
  });

  describe('Exported `log` object', () => {
    test('log.info should call logger.info', () => {
      log.info('test from exported object');
      expect(console.error).toHaveBeenCalledWith(
        '[2025-01-01T00:00:00.000Z] INFO: test from exported object',
      );
    });

    test('log.mcp should create a contextual logger', () => {
      const mcpLogger = log.mcp('my-tool', { id: 1 });
      mcpLogger.info('mcp log');
      expect(console.error).toHaveBeenCalledWith(
        '[2025-01-01T00:00:00.000Z] INFO: mcp log | {"tool":"my-tool","input":{"id":1}}',
      );
    });
  });
});
