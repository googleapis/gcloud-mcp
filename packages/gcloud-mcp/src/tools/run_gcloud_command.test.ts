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

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Mock, beforeEach, describe, expect, test, vi } from 'vitest';
import * as gcloud from '../gcloud.js';
import { createRunGcloudCommand } from './run_gcloud_command.js';

vi.mock('../gcloud.js');
vi.mock('child_process');

const mockServer = {
  registerTool: vi.fn(),
} as unknown as McpServer;

const getToolImplementation = () => {
  expect(mockServer.registerTool).toHaveBeenCalledOnce();
  return (mockServer.registerTool as Mock).mock.calls[0]![2];
};

const createTool = (allowlist: string[] = [], denylist: string[] = []) => {
  createRunGcloudCommand(allowlist, denylist).register(mockServer);
  return getToolImplementation();
};

const mockGcloudLint = (args: string[]) => {
  (gcloud.lint as Mock).mockResolvedValue({
    code: 0,
    stdout: `[{"command_string_no_args": "gcloud ${args.join(' ')}"}]`,
    stderr: '',
  });
};

const mockGcloudInvoke = (stdout: string, stderr: string = '') => {
  (gcloud.invoke as Mock).mockResolvedValue({
    code: 0,
    stdout,
    stderr,
  });
}

describe('createRunGcloudCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('with allowlist', () => {
    test('invokes gcloud for allowlisted command', async () => {
      const tool = createTool(['a b']);
      const inputArgs = ['a', 'b', 'c'];
      mockGcloudLint(inputArgs);
      mockGcloudInvoke('output');

      const result = await tool({ args: inputArgs });

      expect(gcloud.invoke).toHaveBeenCalledWith(inputArgs);
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
      const tool = createTool(['a b']);
      const inputArgs = ['a', 'c'];
      mockGcloudLint(inputArgs);

      const result = await tool({ args: inputArgs });

      expect(gcloud.invoke).not.toHaveBeenCalled();
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `Command is not part of this tool's current allowlist of enabled commands.`, 
          },
        ],
      });
    });
  });

  describe('with denylist', () => {
    test('returns error for denylisted command', async () => {
      const tool = createTool([], ['compute list']);
      const inputArgs = ['compute', 'list', '--zone', 'eastus1'];
      mockGcloudLint(inputArgs);

      const result = await tool({ args: inputArgs });

      expect(gcloud.invoke).not.toHaveBeenCalled();
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `Command is part of this tool's current denylist of disabled commands.`, 
          },
        ],
      });
    });

    test('invokes gcloud for non-denylisted command', async () => {
      const tool = createTool([], ['compute list']);
      const inputArgs = ['compute', 'create'];
      mockGcloudLint(inputArgs);
      mockGcloudInvoke('output');

      const result = await tool({ args: inputArgs });

      expect(gcloud.invoke).toHaveBeenCalledWith(inputArgs);
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

  describe('with allowlist and denylist', () => {
    test('returns error for command in both lists', async () => {
      const tool = createTool(['a b'], ['a b']);
      const inputArgs = ['a', 'b', 'c'];
      mockGcloudLint(inputArgs);

      const result = await tool({ args: inputArgs });

      expect(gcloud.invoke).not.toHaveBeenCalled();
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `Command is part of this tool's current denylist of disabled commands.`, 
          },
        ],
      });
    });
  });

  describe('gcloud invocation results', () => {
    test('returns stdout and stderr when gcloud invocation is successful', async () => {
      const tool = createTool();
      const inputArgs = ['a', 'c'];
      mockGcloudLint(inputArgs);
      mockGcloudInvoke('output', 'error');

      const result = await tool({ args: inputArgs });

      expect(gcloud.invoke).toHaveBeenCalledWith(inputArgs);
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'gcloud process exited with code 0. stdout:\noutput\nstderr:\nerror',
          },
        ],
      });
    });

    test('returns error when gcloud invocation throws an error', async () => {
      const tool = createTool();
      const inputArgs = ['a', 'c'];
      mockGcloudLint(inputArgs);
      (gcloud.invoke as Mock).mockRejectedValue(new Error('gcloud error'));

      const result = await tool({ args: inputArgs });

      expect(gcloud.invoke).toHaveBeenCalledWith(inputArgs);
      expect(result).toEqual({
        content: [{ type: 'text', text: 'gcloud error' }],
        isError: true,
      });
    });

    test('returns error when gcloud invocation throws a non-error', async () => {
      const tool = createTool();
      const inputArgs = ['a', 'c'];
      mockGcloudLint(inputArgs);
      (gcloud.invoke as Mock).mockRejectedValue('error not of Error type');

      const result = await tool({ args: inputArgs });

      expect(gcloud.invoke).toHaveBeenCalledWith(inputArgs);
      expect(result).toEqual({
        content: [{ type: 'text', text: 'An unknown error occurred.' }],
        isError: true,
      });
    });
  });
});
