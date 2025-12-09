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
import { createDeployCloudRun } from './deploy_cloud_run.js';
import * as gcloud from '../gcloud.js';

vi.mock('../gcloud.js');

const mockServer = {
  registerTool: vi.fn(),
} as unknown as McpServer;

const getToolImplementation = () => {
  expect(mockServer.registerTool).toHaveBeenCalledOnce();
  return (mockServer.registerTool as Mock).mock.calls[0]![2] as (params: {
    serviceName: string;
    image: string;
    region: string;
    project?: string;
    allowUnauthenticated?: boolean;
    memory?: string;
    cpu?: string;
    envVars?: Record<string, string>;
    port?: number;
    minInstances?: number;
    maxInstances?: number;
  }) => Promise<{
    content: Array<{ type: string; text: string }>;
    isError?: boolean;
  }>;
};

const createTool = () => {
  createDeployCloudRun().register(mockServer);
  return getToolImplementation();
};

describe('deploy_cloud_run', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('registers tool with correct name and description', () => {
    createDeployCloudRun().register(mockServer);

    expect(mockServer.registerTool).toHaveBeenCalledWith(
      'deploy_cloud_run',
      expect.objectContaining({
        title: 'Deploy to Cloud Run',
        description: expect.stringContaining('Cloud Run'),
      }),
      expect.any(Function),
    );
  });

  test('deploys service successfully with URL from JSON response', async () => {
    vi.mocked(gcloud.invoke).mockImplementation(async (args: string[]) => {
      if (args[0] === 'run' && args[1] === 'deploy') {
        return {
          code: 0,
          stdout: JSON.stringify({
            status: { url: 'https://my-service-abc123.run.app' },
          }),
          stderr: '',
        };
      }
      return { code: 0, stdout: '', stderr: '' };
    });

    const tool = createTool();
    const result = await tool({
      serviceName: 'my-service',
      image: 'gcr.io/my-project/my-image:latest',
      region: 'us-central1',
    });

    expect(result.content[0]!.text).toContain('Cloud Run Deployment Complete');
    expect(result.content[0]!.text).toContain('my-service');
    expect(result.content[0]!.text).toContain('https://my-service-abc123.run.app');
    expect(result.isError).toBeUndefined();
  });

  test('includes all optional parameters in deploy command', async () => {
    const invokeSpy = vi.mocked(gcloud.invoke).mockResolvedValue({
      code: 0,
      stdout: JSON.stringify({ status: { url: 'https://test.run.app' } }),
      stderr: '',
    });

    const tool = createTool();
    await tool({
      serviceName: 'my-service',
      image: 'gcr.io/my-project/my-image:latest',
      region: 'us-central1',
      project: 'custom-project',
      allowUnauthenticated: true,
      memory: '1Gi',
      cpu: '2',
      port: 3000,
      minInstances: 1,
      maxInstances: 10,
      envVars: { KEY1: 'value1', KEY2: 'value2' },
    });

    const deployCall = invokeSpy.mock.calls[0]![0];
    expect(deployCall).toContain('--project');
    expect(deployCall).toContain('custom-project');
    expect(deployCall).toContain('--allow-unauthenticated');
    expect(deployCall).toContain('--memory');
    expect(deployCall).toContain('1Gi');
    expect(deployCall).toContain('--cpu');
    expect(deployCall).toContain('2');
    expect(deployCall).toContain('--port');
    expect(deployCall).toContain('3000');
    expect(deployCall).toContain('--min-instances');
    expect(deployCall).toContain('1');
    expect(deployCall).toContain('--max-instances');
    expect(deployCall).toContain('10');
    expect(deployCall).toContain('--set-env-vars');
  });

  test('falls back to describe command for URL', async () => {
    vi.mocked(gcloud.invoke).mockImplementation(async (args: string[]) => {
      if (args[0] === 'run' && args[1] === 'deploy') {
        return { code: 0, stdout: 'Deploying...', stderr: '' };
      }
      if (args[0] === 'run' && args[1] === 'services' && args[2] === 'describe') {
        return { code: 0, stdout: 'https://fallback-url.run.app\n', stderr: '' };
      }
      return { code: 0, stdout: '', stderr: '' };
    });

    const tool = createTool();
    const result = await tool({
      serviceName: 'my-service',
      image: 'gcr.io/my-project/my-image:latest',
      region: 'us-central1',
    });

    expect(result.content[0]!.text).toContain('https://fallback-url.run.app');
  });

  test('handles deployment failure', async () => {
    vi.mocked(gcloud.invoke).mockResolvedValue({
      code: 1,
      stdout: '',
      stderr: 'ERROR: (gcloud.run.deploy) Permission denied',
    });

    const tool = createTool();
    const result = await tool({
      serviceName: 'my-service',
      image: 'gcr.io/my-project/my-image:latest',
      region: 'us-central1',
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain('Deployment Failed');
    expect(result.content[0]!.text).toContain('Permission denied');
  });

  test('handles gcloud invocation error', async () => {
    vi.mocked(gcloud.invoke).mockRejectedValue(new Error('Network error'));

    const tool = createTool();
    const result = await tool({
      serviceName: 'my-service',
      image: 'gcr.io/my-project/my-image:latest',
      region: 'us-central1',
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain('Network error');
  });

  test('uses no-allow-unauthenticated by default', async () => {
    const invokeSpy = vi.mocked(gcloud.invoke).mockResolvedValue({
      code: 0,
      stdout: JSON.stringify({ status: { url: 'https://test.run.app' } }),
      stderr: '',
    });

    const tool = createTool();
    await tool({
      serviceName: 'my-service',
      image: 'gcr.io/my-project/my-image:latest',
      region: 'us-central1',
    });

    const deployCall = invokeSpy.mock.calls[0]![0];
    expect(deployCall).toContain('--no-allow-unauthenticated');
  });
});
