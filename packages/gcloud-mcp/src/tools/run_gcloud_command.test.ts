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
  createRunGcloudCommand(config, ['interactive']).register(mockServer);
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
};

describe('createRunGcloudCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('gcloud-mcp debug config', () => {
    test('returns user-configured denylist', async () => {
      const tool = createTool({ deny: ['compute list'] });
      const inputArgs = ['gcloud-mcp', 'debug', 'config'];

      const result = await tool({ args: inputArgs });

      expect(gcloud.lint).not.toHaveBeenCalled();
      expect(gcloud.invoke).not.toHaveBeenCalled();
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `# The user has the following commands denylisted:
- compute list`,
          },
        ],
      });
    });

    test('returns user-configured allowlist', async () => {
      const tool = createTool({ allow: ['compute list'] });
      const inputArgs = ['gcloud-mcp', 'debug', 'config'];

      const result = await tool({ args: inputArgs });

      expect(gcloud.lint).not.toHaveBeenCalled();
      expect(gcloud.invoke).not.toHaveBeenCalled();
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `# The user has the following commands allowlisted:
- compute list`,
          },
        ],
      });
    });
  });

  describe('with denylist', () => {
    test('returns error for denylisted command', async () => {
      const tool = createTool({ deny: ['compute list'] });
      const inputArgs = ['compute', 'list', '--zone', 'eastus1'];
      mockGcloudLint(inputArgs);

      const result = await tool({ args: inputArgs });

      expect(gcloud.invoke).not.toHaveBeenCalled();
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `Execution denied: This command is on the denylist. Do not attempt to run this command again - it will always fail. Instead, proceed a different way or ask the user for clarification.
To get the user-specified denylist, invoke this tool again with the args ["gcloud-mcp", "debug", "config"]

## Denylist Behavior:
- The default denylist is ALWAYS active, blocking potentially interactive or sensitive commands.
- A custom denylist can be provided via a configuration file, which is then merged with the default list.
- Command matching is based on prefix. The input command is normalized to ensure only full command groups are matched (e.g., \`app\` matches \`app deploy\` but not \`apphub\`).
- If a GA (General Availability) command is on the denylist, all of its release tracks (e.g., alpha, beta) are denied as well.

### Default Denied Commands:
The following commands are always denied:
-  'interactive'`,
          },
        ],
        isError: true,
      });
    });

    test('invokes gcloud for non-denylisted command', async () => {
      const tool = createTool({ deny: ['compute list'] });
      const inputArgs = ['compute', 'create'];
      mockGcloudLint(inputArgs);
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
      mockGcloudLint(inputArgs);
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
      mockGcloudLint(inputArgs);

      const result = await tool({ args: inputArgs });

      expect(gcloud.invoke).not.toHaveBeenCalled();
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `Execution denied: This command is not on the allowlist. Do not attempt to run this command again - it will always fail. Instead, proceed a different way or ask the user for clarification.
To get the user-specified allowlist, invoke this tool again with the args ["gcloud-mcp", "debug", "config"]

## Allowlist Behavior:
- An allowlist can be provided in the configuration file.
- A configuration file cannot contain both an allowlist and a custom denylist.`,
          },
        ],
        isError: true,
      });
    });
  });

  describe('with allowlist and denylist', () => {
    test('returns error for command in both lists', async () => {
      const tool = createTool({ deny: ['a b'], allow: ['a b'] });
      const inputArgs = ['a', 'b', 'c'];
      mockGcloudLint(inputArgs);

      const result = await tool({ args: inputArgs });

      expect(gcloud.invoke).not.toHaveBeenCalled();
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `Execution denied: This command is on the denylist. Do not attempt to run this command again - it will always fail. Instead, proceed a different way or ask the user for clarification.
To get the user-specified denylist, invoke this tool again with the args ["gcloud-mcp", "debug", "config"]

## Denylist Behavior:
- The default denylist is ALWAYS active, blocking potentially interactive or sensitive commands.
- A custom denylist can be provided via a configuration file, which is then merged with the default list.
- Command matching is based on prefix. The input command is normalized to ensure only full command groups are matched (e.g., \`app\` matches \`app deploy\` but not \`apphub\`).
- If a GA (General Availability) command is on the denylist, all of its release tracks (e.g., alpha, beta) are denied as well.

### Default Denied Commands:
The following commands are always denied:
-  'interactive'`,
          },
        ],
        isError: true,
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
            text: 'output\nstderr:\nerror',
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

  describe('with release track recovery', () => {
    test('denylisted beta command suggests GA', async () => {
      const tool = createTool({ deny: ['beta compute instances list'] });
      const inputArgs = ['beta', 'compute', 'instances', 'list'];
      // The first lint is for the original command.
      mockGcloudLint(inputArgs);
      // The second lint is for the GA alternative.
      (gcloud.lint as Mock)
        .mockResolvedValueOnce({
          code: 0,
          stdout: `[{"command_string_no_args": "gcloud beta compute instances list"}]`,
          stderr: '',
        })
        .mockResolvedValueOnce({
          code: 0,
          stdout: `[{"command_string_no_args": "gcloud compute instances list"}]`,
          stderr: '',
        });

      const result = await tool({ args: inputArgs });

      expect(gcloud.invoke).not.toHaveBeenCalled();
      expect(gcloud.lint).toHaveBeenCalledTimes(2);
      expect(gcloud.lint).toHaveBeenCalledWith('compute instances list');
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `Execution denied: The command 'gcloud beta compute instances list' is on the denylist.
However, a similar command is available: 'gcloud compute instances list'.
Invoke this tool again with this alternative command to fix the issue.`,
          },
        ],
        isError: true,
      });
    });

    test('denylisted alpha command suggests beta', async () => {
      const tool = createTool({ deny: ['alpha compute instances list'] });
      const inputArgs = ['alpha', 'compute', 'instances', 'list'];
      (gcloud.lint as Mock)
        .mockResolvedValueOnce({
          code: 0,
          stdout: `[{"command_string_no_args": "gcloud alpha compute instances list"}]`,
          stderr: '',
        })
        .mockResolvedValueOnce({
          // GA check fails
          code: 1,
          stdout: '',
          stderr: 'not found',
        })
        .mockResolvedValueOnce({
          // beta check succeeds
          code: 0,
          stdout: `[{"command_string_no_args": "gcloud beta compute instances list"}]`,
          stderr: '',
        });

      const result = await tool({ args: inputArgs });

      expect(gcloud.invoke).not.toHaveBeenCalled();
      expect(gcloud.lint).toHaveBeenCalledTimes(3);
      expect(gcloud.lint).toHaveBeenCalledWith('compute instances list');
      expect(gcloud.lint).toHaveBeenCalledWith('beta compute instances list');
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `Execution denied: The command 'gcloud alpha compute instances list' is on the denylist.
However, a similar command is available: 'gcloud beta compute instances list'.
Invoke this tool again with this alternative command to fix the issue.`,
          },
        ],
        isError: true,
      });
    });

    test('denylisted alpha command suggests GA when beta is also denylisted', async () => {
      const tool = createTool({
        deny: ['alpha compute instances list', 'beta compute instances list'],
      });
      const inputArgs = ['alpha', 'compute', 'instances', 'list'];
      (gcloud.lint as Mock)
        .mockResolvedValueOnce({
          code: 0,
          stdout: `[{"command_string_no_args": "gcloud alpha compute instances list"}]`,
          stderr: '',
        })
        .mockResolvedValueOnce({
          // GA check succeeds
          code: 0,
          stdout: `[{"command_string_no_args": "gcloud compute instances list"}]`,
          stderr: '',
        });

      const result = await tool({ args: inputArgs });

      expect(gcloud.invoke).not.toHaveBeenCalled();
      expect(gcloud.lint).toHaveBeenCalledTimes(2);
      expect(gcloud.lint).toHaveBeenCalledWith('compute instances list');
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `Execution denied: The command 'gcloud alpha compute instances list' is on the denylist.
However, a similar command is available: 'gcloud compute instances list'.
Invoke this tool again with this alternative command to fix the issue.`,
          },
        ],
        isError: true,
      });
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
      // The first lint is for the original command.
      (gcloud.lint as Mock)
        .mockResolvedValueOnce({
          code: 0,
          stdout: `[{"command_string_no_args": "gcloud beta compute instances describe"}]`,
          stderr: '',
        })
        .mockResolvedValueOnce({
          // The second lint is for the GA alternative.
          code: 0,
          stdout: `[{"command_string_no_args": "gcloud compute instances describe"}]`,
          stderr: '',
        });

      const result = await tool({ args: inputArgs });

      expect(gcloud.invoke).not.toHaveBeenCalled();
      expect(gcloud.lint).toHaveBeenCalledTimes(2);
      expect(gcloud.lint).toHaveBeenCalledWith(
        'compute instances describe my-instance --zone us-central1-a',
      );
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `Execution denied: The command 'gcloud beta compute instances describe' is on the denylist.
However, a similar command is available: 'gcloud compute instances describe my-instance --zone us-central1-a'.
Invoke this tool again with this alternative command to fix the issue.`,
          },
        ],
        isError: true,
      });
    });

    test('denylisted beta command with no GA alternative returns denylist error', async () => {
      const tool = createTool({ deny: ['beta compute instances list'] });
      const inputArgs = ['beta', 'compute', 'instances', 'list'];
      (gcloud.lint as Mock)
        .mockResolvedValueOnce({
          code: 0,
          stdout: `[{"command_string_no_args": "gcloud beta compute instances list"}]`,
          stderr: '',
        })
        .mockResolvedValueOnce({
          // GA check fails
          code: 1,
          stdout: '',
          stderr: 'not found',
        });

      const result = await tool({ args: inputArgs });

      expect(gcloud.invoke).not.toHaveBeenCalled();
      expect(gcloud.lint).toHaveBeenCalledTimes(2);
      expect(gcloud.lint).toHaveBeenCalledWith('compute instances list');
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(
        'Execution denied: This command is on the denylist.',
      );
    });
  });
});
