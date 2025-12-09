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
import { createSetupProject } from './setup_project.js';
import * as gcloud from '../gcloud.js';

vi.mock('../gcloud.js');

const mockServer = {
  registerTool: vi.fn(),
} as unknown as McpServer;

const getToolImplementation = () => {
  expect(mockServer.registerTool).toHaveBeenCalledOnce();
  return (mockServer.registerTool as Mock).mock.calls[0]![2] as (params: {
    project: string;
    enableApis?: string[];
    region?: string;
    zone?: string;
    setAsDefault?: boolean;
  }) => Promise<{
    content: Array<{ type: string; text: string }>;
    isError?: boolean;
  }>;
};

const createTool = () => {
  createSetupProject().register(mockServer);
  return getToolImplementation();
};

describe('setup_project', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('registers tool with correct name and description', () => {
    createSetupProject().register(mockServer);

    expect(mockServer.registerTool).toHaveBeenCalledWith(
      'setup_project',
      expect.objectContaining({
        title: 'Setup GCP project',
        description: expect.stringContaining('GCP project'),
      }),
      expect.any(Function),
    );
  });

  test('sets project as default', async () => {
    const invokeSpy = vi.mocked(gcloud.invoke).mockResolvedValue({
      code: 0,
      stdout: '',
      stderr: '',
    });

    const tool = createTool();
    const result = await tool({
      project: 'my-project',
      setAsDefault: true,
    });

    expect(invokeSpy).toHaveBeenCalledWith(['config', 'set', 'project', 'my-project']);
    expect(result.content[0]!.text).toContain('Set default project');
    expect(result.content[0]!.text).toContain('✅');
  });

  test('enables API groups correctly', async () => {
    const invokeSpy = vi.mocked(gcloud.invoke).mockResolvedValue({
      code: 0,
      stdout: '',
      stderr: '',
    });

    const tool = createTool();
    await tool({
      project: 'my-project',
      enableApis: ['cloud-run'],
      setAsDefault: false,
    });

    expect(invokeSpy).toHaveBeenCalledWith([
      'services',
      'enable',
      'run.googleapis.com',
      '--project',
      'my-project',
    ]);
    expect(invokeSpy).toHaveBeenCalledWith([
      'services',
      'enable',
      'artifactregistry.googleapis.com',
      '--project',
      'my-project',
    ]);
  });

  test('enables explicit API names', async () => {
    const invokeSpy = vi.mocked(gcloud.invoke).mockResolvedValue({
      code: 0,
      stdout: '',
      stderr: '',
    });

    const tool = createTool();
    await tool({
      project: 'my-project',
      enableApis: ['custom.googleapis.com'],
      setAsDefault: false,
    });

    expect(invokeSpy).toHaveBeenCalledWith([
      'services',
      'enable',
      'custom.googleapis.com',
      '--project',
      'my-project',
    ]);
  });

  test('sets region and zone', async () => {
    const invokeSpy = vi.mocked(gcloud.invoke).mockResolvedValue({
      code: 0,
      stdout: '',
      stderr: '',
    });

    const tool = createTool();
    await tool({
      project: 'my-project',
      region: 'us-central1',
      zone: 'us-central1-a',
      setAsDefault: false,
    });

    expect(invokeSpy).toHaveBeenCalledWith(['config', 'set', 'compute/region', 'us-central1']);
    expect(invokeSpy).toHaveBeenCalledWith(['config', 'set', 'compute/zone', 'us-central1-a']);
  });

  test('reports failed steps', async () => {
    vi.mocked(gcloud.invoke).mockImplementation(async (args: string[]) => {
      if (args.includes('services')) {
        return { code: 1, stdout: '', stderr: 'Permission denied' };
      }
      return { code: 0, stdout: '', stderr: '' };
    });

    const tool = createTool();
    const result = await tool({
      project: 'my-project',
      enableApis: ['compute'],
      setAsDefault: true,
    });

    expect(result.content[0]!.text).toContain('Completed with Errors');
    expect(result.content[0]!.text).toContain('❌');
    expect(result.content[0]!.text).toContain('Permission denied');
    expect(result.isError).toBe(true);
  });

  test('handles gcloud invocation error', async () => {
    vi.mocked(gcloud.invoke).mockRejectedValue(new Error('Connection failed'));

    const tool = createTool();
    const result = await tool({
      project: 'my-project',
      setAsDefault: true,
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain('GCP Project Setup Failed');
    expect(result.content[0]!.text).toContain('Connection failed');
  });

  test('deduplicates APIs', async () => {
    const invokeSpy = vi.mocked(gcloud.invoke).mockResolvedValue({
      code: 0,
      stdout: '',
      stderr: '',
    });

    const tool = createTool();
    await tool({
      project: 'my-project',
      enableApis: ['compute', 'compute.googleapis.com'],
      setAsDefault: false,
    });

    const enableCalls = invokeSpy.mock.calls.filter(
      (call) => call[0]![0] === 'services' && call[0]![1] === 'enable',
    );
    expect(enableCalls.length).toBe(1);
  });
});
