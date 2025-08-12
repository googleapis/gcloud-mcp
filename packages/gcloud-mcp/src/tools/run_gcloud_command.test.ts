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

import { test, expect, vi, Mock, beforeEach, describe } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createRunGcloudCommand } from './run_gcloud_command.js';
import * as gcloud from '../gcloud.js';

vi.mock('../gcloud.js');

const mockServer = {
  registerTool: vi.fn(),
} as unknown as McpServer;

const getToolImplementation = () => {
  expect(mockServer.registerTool).toHaveBeenCalledOnce();
  return (mockServer.registerTool as Mock).mock.calls[0]![2];
};

describe('createRunGcloudCommand', () => {
  let gcloudInvoke: Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    gcloudInvoke = gcloud.invoke as Mock;
  });

  describe('with allowlist', () => {
    test('invokes gcloud for allowlisted command', async () => {
      const allowlist = ['a b'];
      createRunGcloudCommand(allowlist).register(mockServer);
      const toolImplementation = getToolImplementation();
      gcloudInvoke.mockResolvedValue({
        code: 0,
        stdout: 'output',
        stderr: '',
      });

      const result = await toolImplementation({ args: ['a', 'b', 'c'] });

      expect(gcloudInvoke).toHaveBeenCalledWith(['a', 'b', 'c']);
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'gcloud process exited with code 0. stdout:\noutput',
          },
        ],
      });
    });

    test('returns error for non-allowlisted command', async () => {
      const allowlist = ['a b'];
      createRunGcloudCommand(allowlist).register(mockServer);
      const toolImplementation = getToolImplementation();

      const result = await toolImplementation({ args: ['a', 'c'] });

      expect(gcloudInvoke).not.toHaveBeenCalled();
      expect(result).toEqual({
        content: [{ type: 'text', text: 'Command not allowed.' }],
      });
    });
  });

  describe('with denylist', () => {
    test('returns error for denylisted command', async () => {
      const denylist = ['a b'];
      createRunGcloudCommand([], denylist).register(mockServer);
      const toolImplementation = getToolImplementation();

      const result = await toolImplementation({ args: ['a', 'b', 'c'] });

      expect(gcloudInvoke).not.toHaveBeenCalled();
      expect(result).toEqual({
        content: [{ type: 'text', text: 'Command denied.' }],
      });
    });

    test('invokes gcloud for non-denylisted command', async () => {
      const denylist = ['a b'];
      createRunGcloudCommand([], denylist).register(mockServer);
      const toolImplementation = getToolImplementation();
      gcloudInvoke.mockResolvedValue({
        code: 0,
        stdout: 'output',
        stderr: '',
      });

      const result = await toolImplementation({ args: ['a', 'c'] });

      expect(gcloudInvoke).toHaveBeenCalledWith(['a', 'c']);
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'gcloud process exited with code 0. stdout:\noutput',
          },
        ],
      });
    });
  });
});
