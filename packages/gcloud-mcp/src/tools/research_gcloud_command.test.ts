/**
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * 	http://www.apache.org/licenses/LICENSE-2.0
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
import { createResearchGcloudCommand } from './research_gcloud_command.js';

vi.mock('../gcloud.js');

const mockServer = {
  registerTool: vi.fn(),
} as unknown as McpServer;

const getToolImplementation = () => {
  expect(mockServer.registerTool).toHaveBeenCalledOnce();
  return (mockServer.registerTool as Mock).mock.calls[0]![2];
};

const createTool = () => {
  createResearchGcloudCommand().register(mockServer);
  return getToolImplementation();
};

describe('createResearchGcloudCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('returns help and global flags on success', async () => {
    const tool = createTool();
    const inputArgs = ['compute', 'instances', 'list'];

    const helpStdout = '# Help Output';
    // Construct global flags output such that we can verify the slicing logic
    // globalFlagsIndex will be 1 (0-based)
    // We want lines after it.
    const globalStdout = [
      'PREAMBLE',
      'GLOBAL FLAGS',
      'flag1',
      'flag2',
      'flag3',
      'flag4',
      'flag5',
      'flag6',
      'flag7',
      'flag8',
      'flag9',
      'flag10',
      'flag11-should-be-excluded',
    ].join('\n');

    const mockedInvoke = vi.mocked(gcloud.invoke);
    mockedInvoke.mockImplementation(async (args) => {
      if (args.includes('--document=style=markdown')) {
        return { code: 0, stdout: helpStdout, stderr: '' };
      }
      if (args.includes('--format=markdown(global_flags)')) {
        return { code: 0, stdout: globalStdout, stderr: '' };
      }
      return { code: 1, stdout: '', stderr: 'Unknown command' };
    });

    const result = await tool({ args: inputArgs });

    expect(gcloud.invoke).toHaveBeenCalledTimes(2);
    // Verify gcloud command for help was called with correct args
    expect(gcloud.invoke).toHaveBeenCalledWith([
      'compute',
      'instances',
      'list',
      '--document=style=markdown',
    ]);
    // Verify gcloud command for global flags was called
    expect(gcloud.invoke).toHaveBeenCalledWith(['help', '--format=markdown(global_flags)']);

    const output = result.content[0].text;
    expect(output).toContain(helpStdout);
    expect(output).toContain('flag1');
    expect(output).toContain('flag10');
    expect(output).not.toContain('PREAMBLE');
    expect(output).not.toContain('flag11-should-be-excluded');
  });

  test('returns error when help command fails', async () => {
    const tool = createTool();
    const inputArgs = ['compute', 'instances', 'list'];

    const mockedInvoke = vi.mocked(gcloud.invoke);
    mockedInvoke.mockImplementation(async (args) => {
      if (args.includes('--document=style=markdown')) {
        return { code: 1, stdout: '', stderr: 'Help command failed' };
      }
      return { code: 0, stdout: '', stderr: '' };
    });

    const result = await tool({ args: inputArgs });

    // Should stop after first failure
    expect(gcloud.invoke).toHaveBeenCalledTimes(1);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Failed to get help');
    expect(result.content[0].text).toContain('Help command failed');
  });

  test('returns success with warning when global flags command fails', async () => {
    const tool = createTool();
    const inputArgs = ['compute', 'instances', 'list'];
    const helpStdout = '# Help Output';

    const mockedInvoke = vi.mocked(gcloud.invoke);
    mockedInvoke.mockImplementation(async (args) => {
      if (args.includes('--document=style=markdown')) {
        return { code: 0, stdout: helpStdout, stderr: '' };
      }
      if (args.includes('--format=markdown(global_flags)')) {
        return { code: 1, stdout: '', stderr: 'Global flags failed' };
      }
      return { code: 0, stdout: '', stderr: '' };
    });

    const result = await tool({ args: inputArgs });

    expect(gcloud.invoke).toHaveBeenCalledTimes(2);
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain(helpStdout);
    // We expect the result to still be successful, just without global flags
  });

  test('returns error when unexpected exception occurs', async () => {
    const tool = createTool();
    const inputArgs = ['compute', 'instances', 'list'];

    const mockedInvoke = vi.mocked(gcloud.invoke);
    mockedInvoke.mockRejectedValue(new Error('Unexpected error'));

    const result = await tool({ args: inputArgs });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe('Unexpected error');
  });
});
