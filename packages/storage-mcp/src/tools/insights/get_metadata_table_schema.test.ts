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
import { Table } from '@google-cloud/bigquery';

describe('getMetadataTableSchema', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should return schemas with hints for a valid config', async () => {
    const config = {
      link: {
        dataset: 'projects/test-project/datasets/test-dataset',
      },
    };

    vi.spyOn(Table.prototype, 'getMetadata').mockResolvedValue([
      {
        schema: {
          fields: [{ name: 'testField', type: 'STRING' }],
        },
      },
    ]);

    const result = await getMetadataTableSchema({ config: JSON.stringify(config) });

    expect(result.content[0].type).toBe('text');
    const resultData = JSON.parse(result.content[0].text as string);

    expect(resultData).toHaveProperty('test-dataset.bucket_attributes_latest_snapshot_view');
    expect(resultData).toHaveProperty('test-dataset.object_attributes_latest_snapshot_view');
  });

  it('should return an error if linkedDataset is missing', async () => {
    const config = {};
    const result = await getMetadataTableSchema({ config: JSON.stringify(config) });
    const resultData = JSON.parse(result.content[0].text as string);
    expect(resultData.error).toBe('Failed to get metadata table schema');
  });

  it('should return an error if BigQuery API fails', async () => {
    const config = {
      link: {
        dataset: 'projects/test-project/datasets/test-dataset',
      },
    };

    vi.spyOn(Table.prototype, 'getMetadata').mockRejectedValue(new Error('BigQuery API error'));

    const result = await getMetadataTableSchema({ config: JSON.stringify(config) });

    expect(result.content[0].type).toBe('text');
    const resultData = JSON.parse(result.content[0].text as string);

    expect(resultData.error).toBe('Failed to get metadata table schema');
    expect(resultData.details).toBe('BigQuery API error');
  });
});
