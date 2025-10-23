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
import { getMetadataTableSchema } from './get_metadata_table_schema';

import { apiClientFactory } from '../../utility/index.js';

vi.mock('../../utility/index.js');

describe('getMetadataTableSchema', () => {
  const mockGetDatasetConfig = vi.fn();
  const mockGetMetadata = vi.fn();
  const mockDataset = vi.fn(() => ({
    table: vi.fn(() => ({
      getMetadata: mockGetMetadata,
    })),
  }));
  const mockBigQueryClient = {
    dataset: mockDataset,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    const mockStorageInsightsClient = {
      getDatasetConfig: mockGetDatasetConfig,
    };
    (apiClientFactory.getStorageInsightsClient as vi.Mock).mockReturnValue(
      mockStorageInsightsClient,
    );
    (apiClientFactory.getBigQueryClient as vi.Mock).mockReturnValue(mockBigQueryClient);
  });

  it('should return schemas with hints for a valid config', async () => {
    const datasetConfigName =
      'projects/insights-test-project/locations/us-central1/datasetConfigs/test-config';
    const config = {
      link: {
        dataset: 'projects/test-project/datasets/test-dataset',
      },
    };
    mockGetDatasetConfig.mockResolvedValue([config]);

    mockGetMetadata.mockResolvedValueOnce([
      {
        schema: {
          fields: [{ name: 'testField', type: 'STRING' }],
        },
      },
    ]);
    mockGetMetadata.mockResolvedValueOnce([
      {
        schema: {
          fields: [{ name: 'testField', type: 'STRING' }],
        },
      },
    ]);

    const result = await getMetadataTableSchema({ datasetConfigName });

    expect(mockGetDatasetConfig).toHaveBeenCalledWith({ name: datasetConfigName });
    expect(mockDataset).toHaveBeenCalledWith('test-dataset');
    expect(mockGetMetadata).toHaveBeenCalledTimes(2);
    expect(result.content[0].type).toBe('text');
    const resultData = JSON.parse(result.content[0].text as string);

    expect(resultData).toHaveProperty('test-dataset.bucket_attributes_latest_snapshot_view');
    expect(resultData).toHaveProperty('test-dataset.object_attributes_latest_snapshot_view');
  });

  it('should return an error if linkedDataset is missing', async () => {
    const datasetConfigName =
      'projects/insights-test-project/locations/us-central1/datasetConfigs/test-config';
    const config = {};
    mockGetDatasetConfig.mockResolvedValue([config]);

    const result = await getMetadataTableSchema({ datasetConfigName });
    const resultData = JSON.parse(result.content[0].text as string);
    expect(resultData.error).toBe('Failed to get metadata table schema');
    expect(resultData.details).toBe('Configuration does not have a linked dataset.');
  });

  it('should return an error if BigQuery API fails', async () => {
    const datasetConfigName =
      'projects/insights-test-project/locations/us-central1/datasetConfigs/test-config';
    const config = {
      link: {
        dataset: 'projects/test-project/datasets/test-dataset',
      },
    };
    mockGetDatasetConfig.mockResolvedValue([config]);

    mockGetMetadata.mockRejectedValue(new Error('BigQuery API error'));

    const result = await getMetadataTableSchema({ datasetConfigName });

    expect(result.content[0].type).toBe('text');
    const resultData = JSON.parse(result.content[0].text as string);

    expect(resultData.error).toBe('Failed to get metadata table schema');
    expect(resultData.details).toBe('BigQuery API error');
  });

  it('should return an error if getDatasetConfig fails', async () => {
    const datasetConfigName =
      'projects/insights-test-project/locations/us-central1/datasetConfigs/non-existent-config';
    mockGetDatasetConfig.mockRejectedValue(new Error('Dataset config not found'));

    const result = await getMetadataTableSchema({ datasetConfigName });

    expect(result.content[0].type).toBe('text');
    const resultData = JSON.parse(result.content[0].text as string);

    expect(resultData.error).toBe('Failed to retrieve dataset configuration');
    expect(resultData.details).toBe('Dataset config not found');
  });
});
