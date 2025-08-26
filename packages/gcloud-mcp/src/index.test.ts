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
import { createRunGcloudCommand } from './tools/run_gcloud_command.js';
import * as gcloud from './gcloud.js';
import { init } from './commands/init.js';

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
vi.mock('fs');
vi.mock('./commands/init.js');

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  vi.setSystemTime(new Date('2025-01-01T00:00:00.000Z'));
  registerToolSpy.mockClear();
});

test('should initialize Gemini CLI when gcloud-mcp init --agent=gemini-cli is called', async () => {
  process.argv = ['node', 'index.js', 'init', '--agent=gemini-cli'];
  vi.stubGlobal('process', { ...process, exit: vi.fn() });

  await import('./index.js');

  expect(init.handler).toHaveBeenCalled();
  expect(process.exit).toHaveBeenCalledWith(0);
});

test('should exit if gcloud is not available', async () => {
  process.argv = ['node', 'index.js'];
  vi.spyOn(gcloud, 'isAvailable').mockResolvedValue(false);
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.stubGlobal('process', { ...process, exit: vi.fn() });

  await import('./index.js');

  expect(gcloud.isAvailable).toHaveBeenCalled();
  expect(consoleErrorSpy).toHaveBeenCalledWith(
    '[2025-01-01T00:00:00.000Z] ERROR: Unable to start gcloud mcp server: gcloud executable not found.',
  );
  expect(process.exit).toHaveBeenCalledWith(1);

  consoleErrorSpy.mockRestore();
  vi.unstubAllGlobals();
});

test('should start the McpServer if gcloud is available', async () => {
  process.argv = ['node', 'index.js'];
  vi.spyOn(gcloud, 'isAvailable').mockResolvedValue(true);
  const { default_denylist } = await import('./index.js');
  expect(gcloud.isAvailable).toHaveBeenCalled();
  expect(McpServer).toHaveBeenCalledWith(
    {
      name: 'gcloud-mcp-server',
      version: '9.4.1998',
    },
    { capabilities: { tools: {} } },
  );
  expect(createRunGcloudCommand).toHaveBeenCalledWith(default_denylist);
  expect(registerToolSpy).toHaveBeenCalledWith(vi.mocked(McpServer).mock.instances[0]);
  const serverInstance = vi.mocked(McpServer).mock.instances[0];
  expect(serverInstance!.connect).toHaveBeenCalledWith(expect.any(StdioServerTransport));
});
