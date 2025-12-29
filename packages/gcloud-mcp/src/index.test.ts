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

import { test, expect, vi, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as gcloud from './gcloud.js';
import * as gcloud_executor from './gcloud_executor.js';
import { init } from './commands/init.js';
import fs from 'fs';
import path from 'path';

vi.mock('../package.json', () => ({
  default: {
    version: '9.4.1998',
  },
}));
vi.mock('@modelcontextprotocol/sdk/server/mcp.js');
vi.mock('@modelcontextprotocol/sdk/server/stdio.js');

const registerToolSpy = vi.fn();
vi.mock('./tools/run_gcloud_command.js', () => ({
  createRunGcloudCommand: vi.fn(() => ({
    register: registerToolSpy,
  })),
}));
vi.mock('./gcloud.js');
vi.mock('./gcloud_executor.js');
vi.mock('fs');
vi.mock('path');
vi.mock('./commands/init.js');

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  vi.setSystemTime(new Date('2025-01-01T00:00:00.000Z'));
  vi.spyOn(gcloud_executor, 'isAvailable').mockResolvedValue(true);
  vi.mocked(gcloud.create).mockResolvedValue({
    lint: vi.fn(),
    invoke: vi.fn(),
  } as unknown as gcloud.GcloudExecutable);
  registerToolSpy.mockClear();
});

test('should initialize Gemini CLI when gcloud-mcp init --agent=gemini-cli is called', async () => {
  process.argv = ['node', 'index.js', 'init', '--agent=gemini-cli'];
  vi.stubGlobal('process', { ...process, exit: vi.fn(), on: vi.fn() });

  await import('./index.js');

  expect(init.handler).toHaveBeenCalled();
  expect(process.exit).toHaveBeenCalledWith(0);
});

test('should exit if gcloud is not available', async () => {
  process.argv = ['node', 'index.js'];
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.stubGlobal('process', { ...process, exit: vi.fn(), on: vi.fn() });
  vi.mocked(gcloud.create).mockRejectedValue('gcloud executable not found');

  await import('./index.js');

  expect(gcloud.create).toHaveBeenCalled();
  expect(consoleErrorSpy).toHaveBeenCalledWith(
    '[2025-01-01T00:00:00.000Z] ERROR: Unable to start gcloud mcp server: gcloud executable not found',
  );
  expect(process.exit).toHaveBeenCalledWith(1);

  consoleErrorSpy.mockRestore();
  vi.unstubAllGlobals();
});

test('should start the McpServer if gcloud is available', async () => {
  process.argv = ['node', 'index.js'];
  vi.stubGlobal('process', { ...process, exit: vi.fn(), on: vi.fn() });

  await import('./index.js');

  expect(gcloud.create).toHaveBeenCalled();
  expect(McpServer).toHaveBeenCalledWith(
    {
      name: 'gcloud-mcp-server',
      version: '9.4.1998',
    },
    { capabilities: { tools: {} } },
  );
  expect(registerToolSpy).toHaveBeenCalledWith(vi.mocked(McpServer).mock.instances[0]);
  const serverInstance = vi.mocked(McpServer).mock.instances[0];
  expect(serverInstance?.connect).toHaveBeenCalledWith(expect.any(StdioServerTransport));
});

test('should exit if load deny and allow from config file', async () => {
  process.argv = ['node', 'index.js', '--config', 'test-config.json'];
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.stubGlobal('process', { ...process, exit: vi.fn(), on: vi.fn() });
  const config = {
    deny: ['gcloud secrets'],
    allow: ['gcloud compute instances list'],
  };
  vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(config));
  vi.spyOn(path, 'isAbsolute').mockReturnValue(true);

  await import('./index.js');

  expect(consoleErrorSpy).toHaveBeenCalledWith(
    expect.stringContaining(
      '[2025-01-01T00:00:00.000Z] ERROR: Configuration can not specify both "allow" and "deny" lists. Please choose one.',
    ),
  );
  expect(process.exit).toHaveBeenCalledWith(1);
});

test('should exit if config file is not found', async () => {
  process.argv = ['node', 'index.js', '--config', 'not-found.json'];
  vi.spyOn(fs, 'readFileSync').mockImplementation(() => {
    throw new Error('File not found');
  });
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.stubGlobal('process', { ...process, exit: vi.fn(), on: vi.fn() });

  await import('./index.js');

  expect(consoleErrorSpy).toHaveBeenCalledWith(
    expect.stringContaining('ERROR: Error reading or parsing config file: not-found.json'),
  );
  expect(process.exit).toHaveBeenCalledWith(1);
});

test('should exit if config file path is not absolute', async () => {
  process.argv = ['node', 'index.js', '--config', 'relative-path.json'];
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.stubGlobal('process', { ...process, exit: vi.fn(), on: vi.fn() });
  vi.spyOn(path, 'isAbsolute').mockReturnValue(false);

  await import('./index.js');

  expect(consoleErrorSpy).toHaveBeenCalledWith(
    expect.stringContaining('Config file path must be absolute: relative-path.json'),
  );
  expect(process.exit).toHaveBeenCalledWith(1);
});

test('should exit if config file is invalid JSON', async () => {
  process.argv = ['node', 'index.js', '--config', 'invalid.json'];
  vi.spyOn(fs, 'readFileSync').mockReturnValue('invalid json');
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.stubGlobal('process', { ...process, exit: vi.fn(), on: vi.fn() });
  vi.spyOn(path, 'isAbsolute').mockReturnValue(true);

  await import('./index.js');

  expect(consoleErrorSpy).toHaveBeenCalledWith(
    expect.stringContaining('ERROR: Error reading or parsing config file: invalid.json'),
  );
  expect(process.exit).toHaveBeenCalledWith(1);
});

test('should exit if os is windows and it can not find working python', async () => {
  process.argv = ['node', 'index.js'];
  vi.mocked(gcloud.create).mockRejectedValue(
    'No working Python installation found for Windows gcloud execution.',
  );
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.stubGlobal('process', { ...process, exit: vi.fn(), on: vi.fn() });

  await import('./index.js');

  expect(consoleErrorSpy).toHaveBeenCalledWith(
    expect.stringContaining(
      'Unable to start gcloud mcp server: No working Python installation found for Windows gcloud execution.',
    ),
  );
  expect(process.exit).toHaveBeenCalledWith(1);
});

test('should handle uncaught exception', async () => {
  process.argv = ['node', 'index.js'];
  const on = vi.fn();
  vi.stubGlobal('process', { ...process, exit: vi.fn(), on });
  await import('./index.js');
  const uncaughtExceptionHandler = on.mock.calls.find(
    (call) => call[0] === 'uncaughtException',
  )?.[1];
  const serverInstance = vi.mocked(McpServer).mock.instances[0];
  uncaughtExceptionHandler(new Error('test error'));
  expect(serverInstance?.close).toHaveBeenCalled();
});

test('should handle unhandled rejection', async () => {
  process.argv = ['node', 'index.js'];
  const on = vi.fn();
  vi.stubGlobal('process', { ...process, exit: vi.fn(), on });
  await import('./index.js');
  const unhandledRejectionHandler = on.mock.calls.find(
    (call) => call[0] === 'unhandledRejection',
  )?.[1];
  const serverInstance = vi.mocked(McpServer).mock.instances[0];
  unhandledRejectionHandler(new Error('test error'), Promise.resolve());
  expect(serverInstance?.close).toHaveBeenCalled();
});

test('should handle SIGINT', async () => {
  process.argv = ['node', 'index.js'];
  const on = vi.fn();
  vi.stubGlobal('process', { ...process, exit: vi.fn(), on });
  await import('./index.js');
  const sigintHandler = on.mock.calls.find((call) => call[0] === 'SIGINT')?.[1];
  const serverInstance = vi.mocked(McpServer).mock.instances[0];
  sigintHandler();
  expect(serverInstance?.close).toHaveBeenCalled();
});

test('should handle SIGTERM', async () => {
  process.argv = ['node', 'index.js'];
  const on = vi.fn();
  vi.stubGlobal('process', { ...process, exit: vi.fn(), on });
  await import('./index.js');
  const sigtermHandler = on.mock.calls.find((call) => call[0] === 'SIGTERM')?.[1];
  const serverInstance = vi.mocked(McpServer).mock.instances[0];
  sigtermHandler();
  expect(serverInstance?.close).toHaveBeenCalled();
});
