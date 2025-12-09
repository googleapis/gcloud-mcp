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
import { describe, expect, test, vi, beforeEach, Mock } from 'vitest';
import { createGetGcloudContext } from './get_gcloud_context.js';
import * as gcloud from '../gcloud.js';

vi.mock('../gcloud.js');

const mockServer = {
  registerTool: vi.fn(),
} as unknown as McpServer;

const getToolImplementation = () => {
  expect(mockServer.registerTool).toHaveBeenCalledOnce();
  return (mockServer.registerTool as Mock).mock.calls[0]![2] as () => Promise<{
    content: Array<{ type: string; text: string }>;
    isError?: boolean;
  }>;
};

const createTool = () => {
  createGetGcloudContext().register(mockServer);
  return getToolImplementation();
};

describe('get_gcloud_context', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('registers tool with correct name and description', () => {
    createGetGcloudContext().register(mockServer);

    expect(mockServer.registerTool).toHaveBeenCalledWith(
      'get_gcloud_context',
      expect.objectContaining({
        title: 'Get gcloud context',
        description: expect.stringContaining('current gcloud CLI context'),
      }),
      expect.any(Function),
    );
  });

  test('returns all context values when set', async () => {
    vi.mocked(gcloud.invoke).mockImplementation(async (args: string[]) => {
      const command = args.join(' ');
      if (command.includes('account')) {
        return { code: 0, stdout: 'user@example.com\n', stderr: '' };
      }
      if (command.includes('project')) {
        return { code: 0, stdout: 'my-project-123\n', stderr: '' };
      }
      if (command.includes('compute/region')) {
        return { code: 0, stdout: 'us-central1\n', stderr: '' };
      }
      if (command.includes('compute/zone')) {
        return { code: 0, stdout: 'us-central1-a\n', stderr: '' };
      }
      if (command.includes('configurations')) {
        return { code: 0, stdout: 'my-config\n', stderr: '' };
      }
      return { code: 0, stdout: '', stderr: '' };
    });

    const tool = createTool();
    const result = await tool();

    expect(result.content[0]!.text).toContain('user@example.com');
    expect(result.content[0]!.text).toContain('my-project-123');
    expect(result.content[0]!.text).toContain('us-central1');
    expect(result.content[0]!.text).toContain('us-central1-a');
    expect(result.content[0]!.text).toContain('my-config');
    expect(result.isError).toBeUndefined();
  });

  test('handles unset values gracefully', async () => {
    vi.mocked(gcloud.invoke).mockImplementation(async (args: string[]) => {
      const command = args.join(' ');
      if (command.includes('account')) {
        return { code: 0, stdout: 'user@example.com\n', stderr: '' };
      }
      if (command.includes('configurations')) {
        return { code: 0, stdout: 'default\n', stderr: '' };
      }
      return { code: 0, stdout: '(unset)\n', stderr: '' };
    });

    const tool = createTool();
    const result = await tool();

    expect(result.content[0]!.text).toContain('user@example.com');
    expect(result.content[0]!.text).toContain('(not set)');
    expect(result.content[0]!.text).toContain('## Note');
    expect(result.content[0]!.text).toContain('project');
    expect(result.content[0]!.text).toContain('region');
    expect(result.content[0]!.text).toContain('zone');
  });

  test('handles empty string values', async () => {
    vi.mocked(gcloud.invoke).mockResolvedValue({
      code: 0,
      stdout: '',
      stderr: '',
    });

    const tool = createTool();
    const result = await tool();

    expect(result.content[0]!.text).toContain('(not set)');
  });

  test('returns error when gcloud invocation fails', async () => {
    vi.mocked(gcloud.invoke).mockRejectedValue(new Error('gcloud not found'));

    const tool = createTool();
    const result = await tool();

    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain('Failed to get gcloud context');
    expect(result.content[0]!.text).toContain('gcloud not found');
  });

  test('executes all config queries in parallel', async () => {
    const invokeSpy = vi.mocked(gcloud.invoke).mockResolvedValue({
      code: 0,
      stdout: 'value\n',
      stderr: '',
    });

    const tool = createTool();
    await tool();

    expect(invokeSpy).toHaveBeenCalledTimes(5);
    expect(invokeSpy).toHaveBeenCalledWith(['config', 'get-value', 'account']);
    expect(invokeSpy).toHaveBeenCalledWith(['config', 'get-value', 'project']);
    expect(invokeSpy).toHaveBeenCalledWith(['config', 'get-value', 'compute/region']);
    expect(invokeSpy).toHaveBeenCalledWith(['config', 'get-value', 'compute/zone']);
    expect(invokeSpy).toHaveBeenCalledWith([
      'config',
      'configurations',
      'list',
      '--filter=is_active=true',
      '--format=value(name)',
    ]);
  });
});
