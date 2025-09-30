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
  createRunGcloudCommand(config).register(mockServer);
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
            text: `Execution denied: This command is on the deny list. Do not attempt to run this command again - it will always fail. Instead, proceed a different way or ask the user for clarification.
To get the user-specified deny list, invoke this tool again with the args ["gcloud-mcp", "debug", "config"]

## Denylist Behavior:
- A default deny list is ALWAYS active, blocking potentially interactive or sensitive commands.
- A custom deny list can be provided via a configuration file, which is then merged with the default list.
- Matching is done by prefix. The input command is normalized to ensure only full command groups are matched (e.g., \`app\` matches \`app deploy\` but not \`apphub\`).
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
            text: `Execution denied: This command is not on the allow list. Do not attempt to run this command again - it will always fail. Instead, proceed a different way or ask the user for clarification.
To get the user-specified allow list, invoke this tool again with the args ["gcloud-mcp", "debug", "config"]

## Allowlist Behavior:
- An allow list can be provided in the configuration file.
- A configuration file cannot contain both an allow list and a custom deny list.`,
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
            text: `Execution denied: This command is on the deny list. Do not attempt to run this command again - it will always fail. Instead, proceed a different way or ask the user for clarification.
To get the user-specified deny list, invoke this tool again with the args ["gcloud-mcp", "debug", "config"]

## Denylist Behavior:
- A default deny list is ALWAYS active, blocking potentially interactive or sensitive commands.
- A custom deny list can be provided via a configuration file, which is then merged with the default list.
- Matching is done by prefix. The input command is normalized to ensure only full command groups are matched (e.g., \`app\` matches \`app deploy\` but not \`apphub\`).
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
});
