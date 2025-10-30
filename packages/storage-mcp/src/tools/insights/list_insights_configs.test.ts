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

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { listInsightsConfigs, registerListInsightsConfigsTool } from './list_insights_configs';
import { apiClientFactory } from '../../utility/index.js';
import { logger } from '../../utility/logger.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

vi.mock('../../utility/index.js');
vi.mock('../../utility/logger.js');
vi.mock('@modelcontextprotocol/sdk/server/mcp.js');

describe('listInsightsConfigs', () => {
  const mockListDatasetConfigsAsync = vi.fn();
  const mockListServices = vi.fn();
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };

    const mockStorageInsightsClient = {
      listDatasetConfigsAsync: mockListDatasetConfigsAsync,
    };
    (apiClientFactory.getStorageInsightsClient as vi.Mock).mockReturnValue(
      mockStorageInsightsClient,
    );

    const mockServiceUsageClient = {
      listServices: mockListServices,
    };
    (apiClientFactory.getServiceUsageClient as vi.Mock).mockReturnValue(mockServiceUsageClient);

    mockListServices.mockResolvedValue([[{ config: { name: 'storageinsights.googleapis.com' } }]]);

    (logger.error as vi.Mock).mockClear();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return a list of config names when successful', async () => {
    const fakeConfigs = [
      { name: 'projects/test-project/locations/us-central1/datasetConfigs/config1' },
      { name: 'projects/test-project/locations/us-central1/datasetConfigs/config2' },
    ];
    mockListDatasetConfigsAsync.mockImplementation(async function* () {
      yield* fakeConfigs;
    });

    const result = await listInsightsConfigs({ projectId: 'test-project' });

    expect(mockListServices).toHaveBeenCalledWith({
      parent: 'projects/test-project',
      filter: 'state:ENABLED',
    });
    expect(mockListDatasetConfigsAsync).toHaveBeenCalledWith({
      parent: 'projects/test-project/locations/-',
    });
    expect(result.content).toEqual([
      {
        type: 'text',
        text: JSON.stringify({
          configurations: [
            'projects/test-project/locations/us-central1/datasetConfigs/config1',
            'projects/test-project/locations/us-central1/datasetConfigs/config2',
          ],
        }),
      },
    ]);
  });

  it('should return an empty list if no configs are found', async () => {
    mockListDatasetConfigsAsync.mockImplementation(async function* () {
      yield* [];
    });

    const result = await listInsightsConfigs({ projectId: 'test-project' });

    expect(mockListDatasetConfigsAsync).toHaveBeenCalledWith({
      parent: 'projects/test-project/locations/-',
    });
    expect(result.content).toEqual([
      {
        type: 'text',
        text: JSON.stringify({
          configurations: [],
        }),
      },
    ]);
  });

  it('should return an error if listing configs fails', async () => {
    const fakeError = new Error('API Error');
    mockListDatasetConfigsAsync.mockImplementation(async function* () {
      throw fakeError;
    });

    const result = await listInsightsConfigs({ projectId: 'test-project' });

    expect(result.content).toEqual([
      {
        type: 'text',
        text: JSON.stringify({
          error: 'Failed to list dataset configurations',
          details: 'API Error',
        }),
      },
    ]);
    expect(logger.error).toHaveBeenCalledWith('Error listing dataset configs:', fakeError);
  });

  it('should handle non-Error objects thrown during API calls', async () => {
    const fakeNonError = { some: 'detail', code: 500 };
    mockListDatasetConfigsAsync.mockImplementation(async function* () {
      throw fakeNonError;
    });

    const result = await listInsightsConfigs({ projectId: 'test-project' });

    expect(mockListDatasetConfigsAsync).toHaveBeenCalledWith({
      parent: 'projects/test-project/locations/-',
    });
    expect(result.content).toEqual([
      {
        type: 'text',
        text: JSON.stringify({
          error: 'Failed to list dataset configurations',
          details: undefined,
        }),
      },
    ]);
    expect(logger.error).toHaveBeenCalledWith('Error listing dataset configs:', undefined);
  });

  it('should handle non-Error objects thrown during API calls', async () => {
    const fakeNonError = { some: 'detail', code: 500 };
    mockListDatasetConfigsAsync.mockImplementation(async function* () {
      throw fakeNonError;
    });

    const result = await listInsightsConfigs({ projectId: 'test-project' });

    expect(mockListDatasetConfigsAsync).toHaveBeenCalledWith({
      parent: 'projects/test-project/locations/-',
    });

    expect(result.content).toEqual([
      {
        type: 'text',
        text: JSON.stringify({
          error: 'Failed to list dataset configurations',
          details: undefined,
        }),
      },
    ]);

    expect(logger.error).toHaveBeenCalledWith('Error listing dataset configs:', undefined);
  });

  it('should throw an error if projectId is not provided', async () => {
    delete process.env['GOOGLE_CLOUD_PROJECT'];
    delete process.env['GCP_PROJECT_ID'];
    await expect(listInsightsConfigs({})).rejects.toThrow(
      'Project ID not specified. Please specify via the projectId parameter or GOOGLE_CLOUD_PROJECT or GCP_PROJECT_ID environment variable.',
    );
  });

  it('should use GOOGLE_CLOUD_PROJECT if projectId is not provided in params', async () => {
    delete process.env['projectId'];
    process.env.GOOGLE_CLOUD_PROJECT = 'env-project-gc';
    mockListDatasetConfigsAsync.mockImplementation(async function* () {});

    await listInsightsConfigs({});

    expect(mockListServices).toHaveBeenCalledWith({
      parent: 'projects/env-project-gc',
      filter: 'state:ENABLED',
    });
    expect(mockListDatasetConfigsAsync).toHaveBeenCalledWith({
      parent: 'projects/env-project-gc/locations/-',
    });
  });

  it('should use GCP_PROJECT_ID if projectId and GOOGLE_CLOUD_PROJECT are not provided', async () => {
    delete process.env['projectId'];
    delete process.env['GOOGLE_CLOUD_PROJECT'];
    process.env.GCP_PROJECT_ID = 'env-project-gcp';
    mockListDatasetConfigsAsync.mockImplementation(async function* () {});

    await listInsightsConfigs({});

    expect(mockListServices).toHaveBeenCalledWith({
      parent: 'projects/env-project-gcp',
      filter: 'state:ENABLED',
    });
    expect(mockListDatasetConfigsAsync).toHaveBeenCalledWith({
      parent: 'projects/env-project-gcp/locations/-',
    });
  });

  it('should prioritize projectId parameter over environment variables', async () => {
    process.env.GOOGLE_CLOUD_PROJECT = 'env-project-gc';
    process.env.GCP_PROJECT_ID = 'env-project-gcp';
    mockListDatasetConfigsAsync.mockImplementation(async function* () {});

    await listInsightsConfigs({ projectId: 'param-project' });

    expect(mockListServices).toHaveBeenCalledWith({
      parent: 'projects/param-project',
      filter: 'state:ENABLED',
    });
    expect(mockListDatasetConfigsAsync).toHaveBeenCalledWith({
      parent: 'projects/param-project/locations/-',
    });
  });

  it('should throw an error if Storage Insights API is not enabled', async () => {
    mockListServices.mockResolvedValue([
      [
        { config: { name: 'otherapi.googleapis.com' } },
        { config: { name: 'anotherapi.googleapis.com' } },
      ],
    ]);

    await expect(listInsightsConfigs({ projectId: 'test-project' })).rejects.toThrow(
      'Storage Insights API is not enabled for project test-project. Please enable it to proceed.',
    );
    expect(mockListDatasetConfigsAsync).not.toHaveBeenCalled();
  });

  it('should throw an error if listServices returns an empty array', async () => {
    mockListServices.mockResolvedValue([[]]);

    await expect(listInsightsConfigs({ projectId: 'test-project' })).rejects.toThrow(
      'Storage Insights API is not enabled for project test-project. Please enable it to proceed.',
    );
    expect(mockListDatasetConfigsAsync).not.toHaveBeenCalled();
  });

  it('should throw an error if listServices returns service objects without config or name', async () => {
    mockListServices.mockResolvedValue([
      [{}, { config: {} }, { config: { display_name: 'Storage Insights' } }],
    ]);

    await expect(listInsightsConfigs({ projectId: 'test-project' })).rejects.toThrow(
      'Storage Insights API is not enabled for project test-project. Please enable it to proceed.',
    );
    expect(mockListDatasetConfigsAsync).not.toHaveBeenCalled();
  });

  it('should throw an error if serviceUsageClient.listServices fails', async () => {
    const serviceUsageError = new Error('Service Usage API failed');
    mockListServices.mockRejectedValue(serviceUsageError);

    await expect(listInsightsConfigs({ projectId: 'test-project' })).rejects.toThrow(
      'Service Usage API failed',
    );
    expect(mockListDatasetConfigsAsync).not.toHaveBeenCalled();
  });
});

describe('registerListInsightsConfigsTool', () => {
  it('should register the list_insights_configs tool with the server', () => {
    const mockServer = new McpServer();

    registerListInsightsConfigsTool(mockServer);

    expect(mockServer.registerTool).toHaveBeenCalledWith(
      'list_insights_configs',
      expect.any(Object),
      listInsightsConfigs,
    );

    const registrationArgs = (mockServer.registerTool as vi.Mock).mock.calls[0];
    const toolSchema = registrationArgs[1];
    expect(toolSchema.description).toBe(
      'Lists the names of all Storage Insights dataset configurations for a given project.',
    );
    expect(toolSchema.inputSchema).toBeDefined();
  });
});
