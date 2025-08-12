/**
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *\thttp://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { test, expect, vi, Mock, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createRunGcloudCommand } from './run_gcloud_command.js';
import * as gcloud from '../gcloud.js';

const mockServer = {
  registerTool: vi.fn(),
} as unknown as McpServer;

vi.mock('../gcloud.js');

beforeEach(() => {
  vi.clearAllMocks();
});

test('run_gcloud_command with a non-allowlisted command returns an error', async () => {
  const allowlist = ['a b'];
  createRunGcloudCommand(allowlist).register(mockServer);

  const gcloudInvoke = gcloud.invoke as Mock;

  expect(mockServer.registerTool).toHaveBeenCalledOnce();
  const toolImplementation = (mockServer.registerTool as Mock).mock.calls[0]![2];

  const result = await toolImplementation({ args: ['a', 'c'] });
  expect(result).toEqual({
    content: [{ type: 'text', text: 'Command not allowed.' }],
  });
  expect(gcloudInvoke).not.toHaveBeenCalled();
});

test('run_gcloud_command with an allowlisted command invokes gcloud', async () => {
  const allowlist = ['a b'];
  const runGcloudCommand = createRunGcloudCommand(allowlist);
  runGcloudCommand.register(mockServer);

  const gcloudInvoke = gcloud.invoke as Mock;
  gcloudInvoke.mockResolvedValue({
    code: 0,
    stdout: 'output',
    stderr: '',
  });

  expect(mockServer.registerTool).toHaveBeenCalledOnce();
  const toolImplementation = (mockServer.registerTool as Mock).mock.calls[0]![2];

  const result = await toolImplementation({ args: ['a', 'b', 'c'] });
  expect(result).toEqual({
    content: [
      {
        type: 'text',
        text: 'gcloud process exited with code 0. stdout:\noutput',
      },
    ],
  });
  expect(gcloudInvoke).toHaveBeenCalledWith(['a', 'b', 'c']);
});

test('run_gcloud_command with a denylisted command returns an error', async () => {
  const denylist = ['a b'];
  createRunGcloudCommand([], denylist).register(mockServer);

  const gcloudInvoke = gcloud.invoke as Mock;

  expect(mockServer.registerTool).toHaveBeenCalledOnce();
  const toolImplementation = (mockServer.registerTool as Mock).mock.calls[0]![2];

  const result = await toolImplementation({ args: ['a', 'b', 'c'] });
  expect(result).toEqual({
    content: [{ type: 'text', text: 'Command denied.' }],
  });
  expect(gcloudInvoke).not.toHaveBeenCalled();
});

test('run_gcloud_command with a non-denylisted command invokes gcloud', async () => {
  const denylist = ['a b'];
  const runGcloudCommand = createRunGcloudCommand([], denylist);
  runGcloudCommand.register(mockServer);

  const gcloudInvoke = gcloud.invoke as Mock;
  gcloudInvoke.mockResolvedValue({
    code: 0,
    stdout: 'output',
    stderr: '',
  });

  expect(mockServer.registerTool).toHaveBeenCalledOnce();
  const toolImplementation = (mockServer.registerTool as Mock).mock.calls[0]![2];

  const result = await toolImplementation({ args: ['a', 'c'] });
  expect(result).toEqual({
    content: [
      {
        type: 'text',
        text: 'gcloud process exited with code 0. stdout:\noutput',
      },
    ],
  });
  expect(gcloudInvoke).toHaveBeenCalledWith(['a', 'c']);
});
