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

import { test, expect, vi, beforeEach, describe, afterEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createRunGcloudCommand } from './tools/run_gcloud_command.js';
import * as gcloud from './gcloud.js';
import fs from 'fs';
import { init } from './commands/init.js';

vi.mock('../package.json', () => ({
  default: {
    version: '0.1.0',
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
vi.mock('fs');
vi.mock('./commands/init.js');

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  registerToolSpy.mockClear();
});

test('should initialize Gemini CLI when gcloud-mcp init --agent=gemini-cli is called', async () => {
  process.argv = ['node', 'index.js', 'init', '--agent=gemini-cli'];
  await import('./index.js');
  expect(init.handler).toHaveBeenCalled();
});

test('should exit if gcloud is not available', async () => {
  process.argv = ['node', 'index.js'];
  vi.spyOn(gcloud, 'isAvailable').mockResolvedValue(false);
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
  vi.stubGlobal('process', { ...process, exit: vi.fn() });

  await import('./index.js');

  expect(gcloud.isAvailable).toHaveBeenCalled();
  expect(consoleErrorSpy).toHaveBeenCalledWith('Unable to start gcloud mcp server: gcloud executable not found.');
  expect(process.exit).toHaveBeenCalledWith(1);

  consoleErrorSpy.mockRestore();
  vi.unstubAllGlobals();
});

describe('with --config flag', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.spyOn(gcloud, 'isAvailable').mockResolvedValue(true);
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
    // Stub process.exit to avoid test runner termination and to spy on calls
    vi.stubGlobal('process', { ...process, exit: vi.fn() });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  test('should load lists from a valid config file', async () => {
    process.argv = ['node', 'index.js', '--config', '/abs/path/config.json'];
    const config = {
      run_gcloud_command: {
        allowlist: ['projects list'],
        denylist: ['projects delete'],
      },
    };
    vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(config));

    await import('./index.js');

    expect(fs.readFileSync).toHaveBeenCalledWith('/abs/path/config.json', 'utf-8');
    expect(createRunGcloudCommand).toHaveBeenCalledWith(['projects list'], ['projects delete']);
    expect(registerToolSpy).toHaveBeenCalled();
  });

  test('should handle only an allowlist', async () => {
    process.argv = ['node', 'index.js', '--config', '/abs/path/config.json'];
    const config = {
      run_gcloud_command: {
        allowlist: ['projects list'],
      },
    };
    vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(config));

    await import('./index.js');

    expect(createRunGcloudCommand).toHaveBeenCalledWith(['projects list'], []);
  });

  test('should handle only a denylist', async () => {
    process.argv = ['node', 'index.js', '--config', '/abs/path/config.json'];
    const config = {
      run_gcloud_command: {
        denylist: ['projects delete'],
      },
    };
    vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(config));

    await import('./index.js');

    expect(createRunGcloudCommand).toHaveBeenCalledWith([], ['projects delete']);
  });

  test('should use empty lists for partial config', async () => {
    process.argv = ['node', 'index.js', '--config', '/abs/path/config.json'];
    vi.spyOn(fs, 'readFileSync').mockReturnValue('{}'); // Empty JSON
    await import('./index.js');
    expect(createRunGcloudCommand).toHaveBeenCalledWith([], []);
  });

  test('should exit if config path is not absolute', async () => {
    process.argv = ['node', 'index.js', '--config', 'relative/path'];
    await import('./index.js');
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error: The --config path must be an absolute file path.');
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  test('should exit if config file cannot be read', async () => {
    process.argv = ['node', 'index.js', '--config', '/abs/path/config.json'];
    const readError = new Error('File not found');
    vi.spyOn(fs, 'readFileSync').mockImplementation(() => {
      throw readError;
    });

    await import('./index.js');

    expect(consoleErrorSpy).toHaveBeenCalledWith(`Error reading or parsing config file: ${readError}`);
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  test('should exit if config file has invalid JSON', async () => {
    process.argv = ['node', 'index.js', '--config', '/abs/path/config.json'];
    vi.spyOn(fs, 'readFileSync').mockReturnValue('not json');

    await import('./index.js');

    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Error reading or parsing config file:'));
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});

test('should start the McpServer if gcloud is available', async () => {
  process.argv = ['node', 'index.js'];
  vi.spyOn(gcloud, 'isAvailable').mockResolvedValue(true);
  await import('./index.js');
  expect(gcloud.isAvailable).toHaveBeenCalled();
  expect(McpServer).toHaveBeenCalledWith({
    name: 'gcloud-mcp-server',
    version: '0.1.0',
  });
  expect(createRunGcloudCommand).toHaveBeenCalledWith([], []);
  expect(registerToolSpy).toHaveBeenCalledWith(vi.mocked(McpServer).mock.instances[0]);
  const serverInstance = vi.mocked(McpServer).mock.instances[0];
  expect(serverInstance!.connect).toHaveBeenCalledWith(expect.any(StdioServerTransport));
});
