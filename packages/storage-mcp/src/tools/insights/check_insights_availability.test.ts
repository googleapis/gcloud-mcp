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

/// <reference types="vitest/globals" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  checkInsightsAvailability,
  registerCheckInsightsAvailabilityTool,
} from './check_insights_availability.js';
import { apiClientFactory } from '../../utility/index.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

vi.mock('../../utility/index.js');
vi.mock('@modelcontextprotocol/sdk/server/mcp.js');

describe('checkInsightsAvailability', () => {
  const mockListServices = vi.fn();
  const mockListDatasetConfigsAsync = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    const mockServiceUsageClient = {
      listServices: mockListServices,
    };
    const mockStorageInsightsClient = {
      listDatasetConfigsAsync: mockListDatasetConfigsAsync,
    };

    (apiClientFactory.getServiceUsageClient as vi.Mock).mockReturnValue(mockServiceUsageClient);
    (apiClientFactory.getStorageInsightsClient as vi.Mock).mockReturnValue(
      mockStorageInsightsClient,
    );
  });

  it('should return insightsEnabled: false when the service is not enabled', async () => {
    mockListServices.mockResolvedValue([[{ config: { name: 'other.googleapis.com' } }]]);

    const result = await checkInsightsAvailability({ projectId: 'test-project' });

    expect(result.content).toEqual([{ type: 'text', text: '{"insightsEnabled":false}' }]);
    expect(mockListDatasetConfigsAsync).not.toHaveBeenCalled();
  });

  it('should return configurations when the service is enabled', async () => {
    mockListServices.mockResolvedValue([[{ config: { name: 'storageinsights.googleapis.com' } }]]);
    const fakeConfigs = [{ name: 'config-1' }, { name: 'config-2' }];
    mockListDatasetConfigsAsync.mockReturnValue(fakeConfigs);

    const result = await checkInsightsAvailability({ projectId: 'test-project' });

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
          insightsEnabled: true,
          configurations: fakeConfigs,
        }),
      },
    ]);
  });

  it('should return an error when listing configs fails', async () => {
    mockListServices.mockResolvedValue([[{ config: { name: 'storageinsights.googleapis.com' } }]]);
    const fakeError = new Error('API Error');
    mockListDatasetConfigsAsync.mockImplementation(async function* () {
      yield* [];
      throw fakeError;
    });

    const result = await checkInsightsAvailability({ projectId: 'test-project' });

    expect(result.content).toEqual([
      {
        type: 'text',
        text: JSON.stringify({
          insightsEnabled: true,
          error: 'Failed to list dataset configs',
          details: 'API Error',
        }),
      },
    ]);
  });

  it('should throw an error if projectId is not provided', async () => {
    const originalEnv = process.env;
    delete process.env['GOOGLE_CLOUD_PROJECT'];
    await expect(checkInsightsAvailability({})).rejects.toThrow(
      'Project ID not specified. Please specify via the projectId parameter or GOOGLE_CLOUD_PROJECT environment variable.',
    );
    process.env = originalEnv;
  });
});

describe('registerCheckInsightsAvailabilityTool', () => {
  it('should register the check_insights_availability tool with the server', () => {
    const mockServer = new McpServer();
    registerCheckInsightsAvailabilityTool(mockServer);

    expect(mockServer.registerTool).toHaveBeenCalledWith(
      'check_insights_availability',
      expect.any(Object),
      checkInsightsAvailability,
    );
  });
});
