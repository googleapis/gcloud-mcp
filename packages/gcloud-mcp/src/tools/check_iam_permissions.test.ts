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
import { createCheckIamPermissions } from './check_iam_permissions.js';
import * as gcloud from '../gcloud.js';

vi.mock('../gcloud.js');

const mockServer = {
  registerTool: vi.fn(),
} as unknown as McpServer;

const getToolImplementation = () => {
  expect(mockServer.registerTool).toHaveBeenCalledOnce();
  return (mockServer.registerTool as Mock).mock.calls[0]![2] as (params: {
    project: string;
    permissions: string[];
  }) => Promise<{
    content: Array<{ type: string; text: string }>;
    isError?: boolean;
  }>;
};

const createTool = () => {
  createCheckIamPermissions().register(mockServer);
  return getToolImplementation();
};

describe('check_iam_permissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('registers tool with correct name and description', () => {
    createCheckIamPermissions().register(mockServer);

    expect(mockServer.registerTool).toHaveBeenCalledWith(
      'check_iam_permissions',
      expect.objectContaining({
        title: 'Check IAM permissions',
        description: expect.stringContaining('IAM permissions'),
      }),
      expect.any(Function),
    );
  });

  test('returns all granted permissions', async () => {
    vi.mocked(gcloud.invoke).mockImplementation(async (args: string[]) => {
      if (args[0] === 'projects' && args[1] === 'get-iam-policy') {
        return { code: 0, stdout: 'roles/editor\n', stderr: '' };
      }
      if (args[0] === 'projects' && args[1] === 'test-iam-permissions') {
        return {
          code: 0,
          stdout: JSON.stringify({
            permissions: ['compute.instances.create', 'storage.buckets.list'],
          }),
          stderr: '',
        };
      }
      return { code: 0, stdout: '', stderr: '' };
    });

    const tool = createTool();
    const result = await tool({
      project: 'my-project',
      permissions: ['compute.instances.create', 'storage.buckets.list'],
    });

    expect(result.content[0]!.text).toContain('✅ Granted: 2');
    expect(result.content[0]!.text).toContain('❌ Denied: 0');
    expect(result.content[0]!.text).toContain('compute.instances.create');
    expect(result.content[0]!.text).toContain('storage.buckets.list');
    expect(result.isError).toBeUndefined();
  });

  test('returns denied permissions with suggestions', async () => {
    vi.mocked(gcloud.invoke).mockImplementation(async (args: string[]) => {
      if (args[0] === 'projects' && args[1] === 'get-iam-policy') {
        return { code: 0, stdout: 'roles/viewer\n', stderr: '' };
      }
      if (args[0] === 'projects' && args[1] === 'test-iam-permissions') {
        return {
          code: 0,
          stdout: JSON.stringify({
            permissions: ['storage.buckets.list'],
          }),
          stderr: '',
        };
      }
      return { code: 0, stdout: '', stderr: '' };
    });

    const tool = createTool();
    const result = await tool({
      project: 'my-project',
      permissions: ['compute.instances.create', 'storage.buckets.list'],
    });

    expect(result.content[0]!.text).toContain('✅ Granted: 1');
    expect(result.content[0]!.text).toContain('❌ Denied: 1');
    expect(result.content[0]!.text).toContain('Missing Permissions');
    expect(result.content[0]!.text).toContain('compute.instances.create');
  });

  test('handles get-iam-policy failure', async () => {
    vi.mocked(gcloud.invoke).mockImplementation(async (args: string[]) => {
      if (args[0] === 'projects' && args[1] === 'get-iam-policy') {
        return { code: 1, stdout: '', stderr: 'Permission denied' };
      }
      return { code: 0, stdout: '', stderr: '' };
    });

    const tool = createTool();
    const result = await tool({
      project: 'my-project',
      permissions: ['compute.instances.create'],
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain('Permission denied');
  });

  test('handles test-iam-permissions failure', async () => {
    vi.mocked(gcloud.invoke).mockImplementation(async (args: string[]) => {
      if (args[0] === 'projects' && args[1] === 'get-iam-policy') {
        return { code: 0, stdout: 'roles/editor\n', stderr: '' };
      }
      if (args[0] === 'projects' && args[1] === 'test-iam-permissions') {
        return { code: 1, stdout: '', stderr: 'API not enabled' };
      }
      return { code: 0, stdout: '', stderr: '' };
    });

    const tool = createTool();
    const result = await tool({
      project: 'my-project',
      permissions: ['compute.instances.create'],
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain('API not enabled');
  });

  test('handles invalid JSON response gracefully', async () => {
    vi.mocked(gcloud.invoke).mockImplementation(async (args: string[]) => {
      if (args[0] === 'projects' && args[1] === 'get-iam-policy') {
        return { code: 0, stdout: 'roles/editor\n', stderr: '' };
      }
      if (args[0] === 'projects' && args[1] === 'test-iam-permissions') {
        return { code: 0, stdout: 'not valid json', stderr: '' };
      }
      return { code: 0, stdout: '', stderr: '' };
    });

    const tool = createTool();
    const result = await tool({
      project: 'my-project',
      permissions: ['compute.instances.create'],
    });

    expect(result.content[0]!.text).toContain('❌ Denied: 1');
  });

  test('handles gcloud invocation error', async () => {
    vi.mocked(gcloud.invoke).mockRejectedValue(new Error('gcloud not found'));

    const tool = createTool();
    const result = await tool({
      project: 'my-project',
      permissions: ['compute.instances.create'],
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain('Failed to check IAM permissions');
    expect(result.content[0]!.text).toContain('gcloud not found');
  });
});
