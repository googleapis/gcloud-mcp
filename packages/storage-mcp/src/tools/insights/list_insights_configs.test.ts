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

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { listInsightsConfigs, registerListInsightsConfigsTool } from './list_insights_configs';
import { apiClientFactory } from '../../utility/index.js';
import { logger } from '../../utility/logger.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

vi.mock('../../utility/index.js');
vi.mock('../../utility/logger.js');
vi.mock('@modelcontextprotocol/sdk/server/mcp.js');

describe('listInsightsConfigs', () => {
  const mockListDatasetConfigsAsync = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    const mockStorageInsightsClient = {
      listDatasetConfigsAsync: mockListDatasetConfigsAsync,
    };

    (apiClientFactory.getStorageInsightsClient as vi.Mock).mockReturnValue(
      mockStorageInsightsClient,
    );
  
    (logger.error as vi.Mock).mockClear();
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
      yield* [];
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
    const originalEnv = process.env;
    delete process.env['GOOGLE_CLOUD_PROJECT'];
    await expect(listInsightsConfigs({})).rejects.toThrow(
      'Project ID not specified. Please specify via the projectId parameter or GOOGLE_CLOUD_PROJECT or GCP_PROJECT_ID environment variable.',
    );
    process.env = originalEnv;
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
  });
});
