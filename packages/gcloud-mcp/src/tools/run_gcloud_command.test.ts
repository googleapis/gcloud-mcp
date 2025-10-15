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
import { McpConfig } from '../index.js';
import { createAccessControlList } from '../denylist.js';

vi.mock('../gcloud.js');
vi.mock('child_process');
vi.mock('../index.js', () => ({
  default_deny: ['interactive'],
}));

const mockServer = {
  registerTool: vi.fn(),
} as unknown as McpServer;

const getToolImplementation = () => {
  expect(mockServer.registerTool).toHaveBeenCalledOnce();
  return (mockServer.registerTool as Mock).mock.calls[0]![2];
};

const createTool = (config: McpConfig = {}) => {
  const acl = createAccessControlList(config.allow, [...(config.deny ?? []), 'interactive']);
  createRunGcloudCommand(acl).register(mockServer);
  return getToolImplementation();
};

const mockGcloudLint = () => {
  const mockedLint = vi.mocked(gcloud.lint);
  mockedLint.mockImplementation(async (cmd: string) => {
    return {
      success: true,
      parsedCommand: cmd.split(' ').filter(t => !t.startsWith('-')).join(' '),
    }
  });
};

const mockGcloudInvoke = (stdout: string, stderr: string = '') => {
  const mockedInvoke = vi.mocked(gcloud.invoke);
  mockedInvoke.mockResolvedValue({
    code: 0,
    stdout,
    stderr,
  });
};

describe('createRunGcloudCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGcloudLint();
  });

  describe('gcloud-mcp debug config', () => {
    test('returns user-configured denylist', async () => {
      const tool = createTool({ deny: ['compute list'] });
      const inputArgs = ['gcloud-mcp', 'debug', 'config'];

      const result = await tool({ args: inputArgs });

      expect(gcloud.lint).not.toHaveBeenCalled();
      expect(gcloud.invoke).not.toHaveBeenCalled();

      expect(result.content[0].text).toContain('Denylisted');
      expect(result.content[0].text).toContain('- compute list');
    });

    test('returns user-configured allowlist', async () => {
      const tool = createTool({ allow: ['compute list'] });
      const inputArgs = ['gcloud-mcp', 'debug', 'config'];

      const result = await tool({ args: inputArgs });

      expect(gcloud.lint).not.toHaveBeenCalled();
      expect(gcloud.invoke).not.toHaveBeenCalled();

      expect(result.content[0].text).toContain('Allowlisted');
      expect(result.content[0].text).toContain('- compute list');
    });
  });

  describe('with denylist', () => {
    test('returns error for denylisted command', async () => {
      const tool = createTool({ deny: ['compute list'] });
      const inputArgs = ['compute', 'list', '--zone', 'eastus1'];
      mockGcloudLint();

      const result = await tool({ args: inputArgs });

      expect(gcloud.invoke).not.toHaveBeenCalled();
      expect(result.content[0].text).toContain('Execution denied:');
      expect(result.content[0].text).toContain('["gcloud-mcp", "debug", "config"]');
      expect(result.isError).toBe(true);
    });

    test('invokes gcloud for non-denylisted command', async () => {
      const tool = createTool({ deny: ['compute list'] });
      const inputArgs = ['compute', 'create'];
      mockGcloudInvoke('output');

      const result = await tool({ args: inputArgs });

      expect(gcloud.invoke).toHaveBeenCalledWith(inputArgs);
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'output',
          },
        ],
      });
    });
  });

  describe('with allowlist', () => {
    test('invokes gcloud for allowlisted command', async () => {
      const tool = createTool({ allow: ['compute list'] });
      const inputArgs = ['compute', 'list'];
      mockGcloudInvoke('output');

      const result = await tool({ args: inputArgs });

      expect(gcloud.invoke).toHaveBeenCalledWith(inputArgs);
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'output',
          },
        ],
      });
    });

    test('returns error for non-allowlisted command', async () => {
      const tool = createTool({ allow: ['compute list'] });
      const inputArgs = ['compute', 'create'];

      const result = await tool({ args: inputArgs });

      expect(gcloud.invoke).not.toHaveBeenCalled();
      expect(result.content[0].text).toContain('Execution denied:');
      expect(result.content[0].text).toContain('["gcloud-mcp", "debug", "config"]');
      expect(result.isError).toBe(true);
    });
  });

  describe('with allowlist and denylist', () => {
    test('returns error for command in both lists', async () => {
      const tool = createTool({ deny: ['a b'], allow: ['a b'] });
      const inputArgs = ['a', 'b', 'c'];

      const result = await tool({ args: inputArgs });

      expect(gcloud.invoke).not.toHaveBeenCalled();
      expect(result.content[0].text).toContain('Execution denied:');
      expect(result.content[0].text).toContain('["gcloud-mcp", "debug", "config"]');
      expect(result.isError).toBe(true);
    });
  });

  describe('gcloud invocation results', () => {
    test('returns stdout and stderr when gcloud invocation is successful', async () => {
      const tool = createTool();
      const inputArgs = ['a', 'c'];
      mockGcloudInvoke('output', 'error');

      const result = await tool({ args: inputArgs });

      expect(gcloud.invoke).toHaveBeenCalledWith(inputArgs);
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'output\nSTDERR:\nerror',
          },
        ],
      });
    });

    test('returns error when gcloud invocation throws an error', async () => {
      const tool = createTool();
      const inputArgs = ['a', 'c'];

      const mockedInvoke = vi.mocked(gcloud.invoke);
      mockedInvoke.mockRejectedValue(new Error('gcloud error'));

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

      const mockedInvoke = vi.mocked(gcloud.invoke);
      mockedInvoke.mockRejectedValue('error not of Error type');

      const result = await tool({ args: inputArgs });

      expect(gcloud.invoke).toHaveBeenCalledWith(inputArgs);
      expect(result).toEqual({
        content: [{ type: 'text', text: 'An unknown error occurred.' }],
        isError: true,
      });
    });
  });

  describe('with release track recovery', () => {
    test('denylisted beta command suggests GA', async () => {
      const tool = createTool({ deny: ['beta compute instances list'] });
      const inputArgs = ['beta', 'compute', 'instances', 'list'];

      const result = await tool({ args: inputArgs });

      expect(gcloud.invoke).not.toHaveBeenCalled();
      expect(gcloud.lint).toHaveBeenCalledTimes(3);
      expect(gcloud.lint).toHaveBeenCalledWith('compute instances list');
      expect(result.content[0].text).toContain('Execution denied');
      expect(result.content[0].text).toContain('invoke this tool again');
      expect(result.content[0].text).toContain('gcloud compute instances list');
      expect(result.isError).toBe(true);
    });

    test('denylisted alpha command suggests GA when beta is also denylisted', async () => {
      const tool = createTool({
        deny: ['alpha compute instances list', 'beta compute instances list'],
      });
      const inputArgs = ['alpha', 'compute', 'instances', 'list'];
      const result = await tool({ args: inputArgs });

      expect(gcloud.invoke).not.toHaveBeenCalled();
      expect(gcloud.lint).toHaveBeenCalledTimes(3);
      expect(gcloud.lint).toHaveBeenCalledWith('compute instances list');
      expect(result.content[0].text).toContain('Execution denied');
      expect(result.content[0].text).toContain('invoke this tool again');
      expect(result.content[0].text).toContain('gcloud compute instances list');
      expect(result.isError).toBe(true);
    });

    test('denylisted beta describe command with args and flags suggests GA equivalent', async () => {
      const tool = createTool({ deny: ['beta compute instances describe'] });
      const inputArgs = [
        'beta',
        'compute',
        'instances',
        'describe',
        'my-instance',
        '--zone',
        'us-central1-a',
      ];

      const result = await tool({ args: inputArgs });

      expect(gcloud.invoke).not.toHaveBeenCalled();
      expect(gcloud.lint).toHaveBeenCalledTimes(3);
      expect(gcloud.lint).toHaveBeenCalledWith(
        'compute instances describe my-instance --zone us-central1-a',
      );
      expect(result.content[0].text).toContain('Execution denied');
      expect(result.content[0].text).toContain('invoke this tool again');
      expect(result.content[0].text).toContain(
        'gcloud compute instances describe my-instance --zone us-central1-a',
      );
      expect(result.isError).toBe(true);
    });

    test('denylisted beta command with interleaved flags suggests GA equivalent', async () => {
      const tool = createTool({ deny: ['beta config list'] });
      const inputArgs = ['beta', '--log-http', 'config', '--verbosity', 'debug', 'list'];

      const result = await tool({ args: inputArgs });

      expect(gcloud.invoke).not.toHaveBeenCalled();
      expect(gcloud.lint).toHaveBeenCalledTimes(2);
      expect(gcloud.lint).toHaveBeenCalledWith('--log-http config --verbosity debug list');
      expect(result.content[0].text).toContain('Execution denied');
      expect(result.content[0].text).toContain('invoke this tool again');
      expect(result.content[0].text).toContain('gcloud --log-http config --verbosity debug list');
      expect(result.isError).toBe(true);
    });
  });

  describe('with release track recovery and allowlist', () => {
    test('non-allowlisted beta command suggests GA', async () => {
      const tool = createTool({ allow: ['compute instances list'] });
      const inputArgs = ['beta', 'compute', 'instances', 'list'];

      const result = await tool({ args: inputArgs });

      expect(gcloud.invoke).not.toHaveBeenCalled();
      expect(gcloud.lint).toHaveBeenCalledTimes(3);
      expect(gcloud.lint).toHaveBeenCalledWith('beta compute instances list');
      expect(result.context[0]).toEqual({})
      expect(result.content[0].text).toContain('Execution denied');
      expect(result.content[0].text).toContain('Invoke this tool again');
      expect(result.content[0].text).toContain('gcloud compute instances list');
      expect(result.isError).toBe(true);
    });

    test('non-allowlisted ALPHA command suggests beta', async () => {
      const tool = createTool({ allow: ['beta compute'] });
      const inputArgs = ['alpha', 'compute', 'instances', 'list'];

      const result = await tool({ args: inputArgs });

      expect(gcloud.invoke).not.toHaveBeenCalled();
      expect(gcloud.lint).toHaveBeenCalledTimes(4);
      expect(gcloud.lint).toHaveBeenCalledWith('beta compute instances list');
      expect(result.content[0].text).toContain('Execution denied');
      expect(result.content[0].text).toContain('invoke this tool again');
      expect(result.content[0].text).toContain('gcloud beta compute instances list');
      expect(result.isError).toBe(true);
    });
    test('non-allowlisted GA command suggests beta', async () => {
      const tool = createTool({ allow: ['beta compute'] });
      const inputArgs = ['compute', 'instances', 'list'];

      const result = await tool({ args: inputArgs });

      expect(gcloud.invoke).not.toHaveBeenCalled();
      expect(gcloud.lint).toHaveBeenCalledTimes(3);
      expect(gcloud.lint).toHaveBeenCalledWith('beta compute instances list');
      expect(result.content[0].text).toContain('Execution denied');
      expect(result.content[0].text).toContain('invoke this tool again');
      expect(result.content[0].text).toContain('gcloud beta compute instances list');
      expect(result.isError).toBe(true);
    });
  });
});
