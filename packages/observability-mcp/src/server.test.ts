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
import { registerTools } from './tools/registration.js';
import { init } from './commands/init.js';

vi.mock('../package.json', () => ({
  default: {
    version: '1.2.3',
  },
}));
vi.mock('@modelcontextprotocol/sdk/server/mcp.js');
vi.mock('@modelcontextprotocol/sdk/server/stdio.js');
vi.mock('./tools/registration.js');
vi.mock('./commands/init.js');

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});

test('should initialize Gemini CLI when observability-mcp init --agent=gemini-cli is called', async () => {
  process.argv = ['node', 'server.js', 'init', '--agent=gemini-cli'];
  vi.stubGlobal('process', { ...process, exit: vi.fn() });

  await import('./server.js');

  expect(init.handler).toHaveBeenCalled();
  expect(process.exit).toHaveBeenCalledWith(0);
});

test('should start the McpServer', async () => {
  process.argv = ['node', 'server.js'];
  await import('./server.js');

  expect(McpServer).toHaveBeenCalledWith({
    name: 'observability-mcp',
    version: '1.2.3',
    title: 'Cloud Observability MCP',
  });

  const serverInstance = vi.mocked(McpServer).mock.instances[0];
  expect(serverInstance).toBeDefined();
  expect(registerTools).toHaveBeenCalledWith(serverInstance);
  expect(serverInstance!.connect).toHaveBeenCalledWith(expect.any(StdioServerTransport));
});
