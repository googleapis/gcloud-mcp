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
import {
  getMetadataTableSchema,
  registerGetMetadataTableSchemaTool,
} from './get_metadata_table_schema';
import { apiClientFactory } from '../../utility/index.js';
import { logger } from '../../utility/logger.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

vi.mock('../../utility/index.js');
vi.mock('../../utility/logger.js');
vi.mock('@modelcontextprotocol/sdk/server/mcp.js');

describe('getMetadataTableSchema', () => {
  const mockGetDatasetConfig = vi.fn();
  const mockListServices = vi.fn();
  const mockGetMetadata = vi.fn();
  const mockDataset = vi.fn(() => ({
    table: vi.fn(() => ({
      getMetadata: mockGetMetadata,
    })),
  }));

  const mockBigQueryClient = { dataset: mockDataset };
  const validParams = {
    datasetConfigName: 'test-config',
    datasetConfigLocation: 'us-central1',
    projectId: 'insights-test-project',
  };
  const validConfig = {
    link: { dataset: 'projects/insights-test-project/datasets/test-dataset' },
  };
  const expectedBucketViewName = 'test-dataset.bucket_attributes_latest_snapshot_view';
  const expectedObjectViewName = 'test-dataset.object_attributes_latest_snapshot_view';

  beforeEach(() => {
    vi.clearAllMocks();

    (apiClientFactory.getStorageInsightsClient as vi.Mock).mockReturnValue({
      getDatasetConfig: mockGetDatasetConfig,
    });
    (apiClientFactory.getBigQueryClient as vi.Mock).mockReturnValue(mockBigQueryClient);
    (apiClientFactory.getServiceUsageClient as vi.Mock).mockReturnValue({
      listServices: mockListServices,
    });

    mockListServices.mockResolvedValue([[{ config: { name: 'storageinsights.googleapis.com' } }]]);
    process.env['GOOGLE_CLOUD_PROJECT'] = 'insights-test-project';
    (logger.error as vi.Mock).mockClear();
  });

  afterEach(() => {
    delete process.env['GOOGLE_CLOUD_PROJECT'];
    delete process.env['GCP_PROJECT_ID'];
  });

  it('returns schemas with hints for a valid config', async () => {
    mockGetDatasetConfig.mockResolvedValue([validConfig]);
    mockGetMetadata.mockResolvedValueOnce([
      {
        schema: {
          fields: [
            { name: 'name', type: 'STRING' },
            { name: 'testField', type: 'STRING' },
          ],
        },
      },
    ]);
    mockGetMetadata.mockResolvedValueOnce([
      {
        schema: {
          fields: [
            { name: 'bucket', type: 'STRING' },
            { name: 'anotherField', type: 'INTEGER' },
          ],
        },
      },
    ]);

    const result = await getMetadataTableSchema(validParams);
    const resultData = JSON.parse(result.content[0].text as string);

    expect(mockListServices).toHaveBeenCalledWith({
      parent: 'projects/insights-test-project',
      filter: 'state:ENABLED',
    });
    expect(mockGetDatasetConfig).toHaveBeenCalledWith({
      name: 'projects/insights-test-project/locations/us-central1/datasetConfigs/test-config',
    });
    expect(mockDataset).toHaveBeenCalledWith('test-dataset');
    expect(mockGetMetadata).toHaveBeenCalledTimes(2);

    expect(resultData).toHaveProperty(expectedBucketViewName);
    expect(resultData[expectedBucketViewName]).toEqual([
      { name: 'name', type: 'STRING', hint: 'The name of the source bucket.' },
      { name: 'testField', type: 'STRING' },
    ]);
    expect(resultData).toHaveProperty(expectedObjectViewName);
    expect(resultData[expectedObjectViewName]).toEqual([
      { name: 'bucket', type: 'STRING', hint: 'The name of the bucket containing this object.' },
      { name: 'anotherField', type: 'INTEGER' },
    ]);
  });

  it('returns error if linkedDataset is missing', async () => {
    mockGetDatasetConfig.mockResolvedValue([{}]);

    const result = await getMetadataTableSchema(validParams);
    const resultData = JSON.parse(result.content[0].text as string);

    expect(resultData).toEqual({
      error: 'Failed to get metadata table schema',
      details: 'Configuration does not have a linked dataset.',
    });
    expect(logger.error).toHaveBeenCalledWith(
      'Error getting metadata table schema:',
      expect.any(Error),
    );
  });

  it('returns error if BigQuery API fails', async () => {
    mockGetDatasetConfig.mockResolvedValue([validConfig]);
    const fakeError = new Error('BigQuery API error');
    mockGetMetadata.mockRejectedValue(fakeError);

    const result = await getMetadataTableSchema(validParams);
    const resultData = JSON.parse(result.content[0].text as string);

    expect(resultData).toEqual({
      error: 'Failed to get metadata table schema',
      details: 'BigQuery API error',
    });
    expect(logger.error).toHaveBeenCalledWith('Error getting metadata table schema:', fakeError);
  });

  it('returns error if getDatasetConfig fails', async () => {
    const fakeError = new Error('Dataset config not found');
    mockGetDatasetConfig.mockRejectedValue(fakeError);

    const result = await getMetadataTableSchema(validParams);
    const resultData = JSON.parse(result.content[0].text as string);

    expect(resultData).toEqual({
      error: 'Failed to retrieve dataset configuration',
      details: 'Dataset config not found',
    });
    expect(logger.error).toHaveBeenCalledWith('Error getting dataset config:', fakeError);
  });

  it('throws error if Storage Insights API is not enabled', async () => {
    mockListServices.mockResolvedValue([[]]);

    await expect(getMetadataTableSchema(validParams)).rejects.toThrow(
      'Storage Insights API is not enabled for project insights-test-project. Please enable it to proceed.',
    );
    expect(mockListServices).toHaveBeenCalled();
    expect(mockGetDatasetConfig).not.toHaveBeenCalled();
  });

  it('throws error if projectId is not provided', async () => {
    delete process.env['GOOGLE_CLOUD_PROJECT'];
    delete process.env['GCP_PROJECT_ID'];

    await expect(
      getMetadataTableSchema({
        datasetConfigName: 'test-config',
        datasetConfigLocation: 'us-central1',
      }),
    ).rejects.toThrow(
      'Project ID not specified. Please specify via the projectId parameter or GOOGLE_CLOUD_PROJECT or GCP_PROJECT_ID environment variable.',
    );
  });

  it('handles non-Error objects thrown during getDatasetConfig', async () => {
    const fakeNonError = { code: 500, message: 'Non-Error issue' };
    mockGetDatasetConfig.mockRejectedValue(fakeNonError);

    const result = await getMetadataTableSchema(validParams);
    const resultData = JSON.parse(result.content[0].text as string);

    expect(resultData).toEqual({
      error: 'Failed to retrieve dataset configuration',
      details: undefined,
    });
    expect(logger.error).toHaveBeenCalledWith('Error getting dataset config:', undefined);
  });

  it('handles non-Error objects thrown during BigQuery calls', async () => {
    mockGetDatasetConfig.mockResolvedValue([validConfig]);
    const fakeNonError = { status: 'failed' };
    mockGetMetadata.mockRejectedValue(fakeNonError);

    const result = await getMetadataTableSchema(validParams);
    const resultData = JSON.parse(result.content[0].text as string);

    expect(resultData).toEqual({
      error: 'Failed to get metadata table schema',
      details: undefined,
    });
    expect(logger.error).toHaveBeenCalledWith('Error getting metadata table schema:', undefined);
  });

  it('returns error if dataset ID cannot be extracted', async () => {
    const configWithInvalidDataset = {
      link: { dataset: 'projects/insights-test-project/datasets/' },
    };
    mockGetDatasetConfig.mockResolvedValue([configWithInvalidDataset]);

    const result = await getMetadataTableSchema(validParams);
    const resultData = JSON.parse(result.content[0].text as string);

    expect(resultData).toEqual({
      error: 'Failed to get metadata table schema',
      details: 'Could not extract dataset ID from linked dataset.',
    });
    expect(logger.error).toHaveBeenCalledWith(
      'Error getting metadata table schema:',
      expect.any(Error),
    );
  });
});

describe('registerGetMetadataTableSchemaTool', () => {
  it('should register the get_metadata_table_schema tool with the server', () => {
    const mockServer = new McpServer();
    vi.spyOn(mockServer, 'registerTool');
    registerGetMetadataTableSchemaTool(mockServer);

    expect(mockServer.registerTool).toHaveBeenCalledWith(
      'get_metadata_table_schema',
      {
        description: expect.any(String),
        inputSchema: expect.any(Object),
        annotations: { displayOutput: false },
      },
      getMetadataTableSchema,
    );
  });
});
