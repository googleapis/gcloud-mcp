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

import { describe, it, expect, vi } from 'vitest';
import { listResourceBackupConfigs } from './list_resource_backup_config.js';
import { googleCloudHttpClient } from '../../utility/gcp_http_client.js';

vi.mock('../../utility/gcp_http_client', () => ({
  googleCloudHttpClient: {
    listResourceBackupConfigs: vi.fn(),
  },
}));

describe('listResourceBackupConfigs', () => {
  it('should return a list of resource backup configs', async () => {
    const params = {
      project_id: 'test-project',
      location: 'us-central1',
    };
    const expectedConfigs = [{ name: 'config1' }, { name: 'config2' }];
    vi.mocked(googleCloudHttpClient.listResourceBackupConfigs).mockResolvedValue(expectedConfigs);

    const result = await listResourceBackupConfigs(params);

    expect(googleCloudHttpClient.listResourceBackupConfigs).toHaveBeenCalledWith({
      projectId: 'test-project',
      location: 'us-central1',
    });
    expect(result).toEqual({
      content: [{ type: 'text', text: JSON.stringify(expectedConfigs, null, 2) }],
    });
  });

  it('should return a list of resource backup configs with all parameters', async () => {
    const params = {
      project_id: 'test-project',
      location: 'us-central1',
      page_size: 10,
      page_token: 'token',
      filter: 'filter',
      order_by: 'order',
    };
    const expectedConfigs = [{ name: 'config1' }, { name: 'config2' }];
    vi.mocked(googleCloudHttpClient.listResourceBackupConfigs).mockResolvedValue(expectedConfigs);

    const result = await listResourceBackupConfigs(params);

    expect(googleCloudHttpClient.listResourceBackupConfigs).toHaveBeenCalledWith({
      projectId: 'test-project',
      location: 'us-central1',
      pageSize: 10,
      pageToken: 'token',
      filter: 'filter',
      orderBy: 'order',
    });
    expect(result).toEqual({
      content: [{ type: 'text', text: JSON.stringify(expectedConfigs, null, 2) }],
    });
  });

  it('should return an error if the api call fails', async () => {
    const params = {
      project_id: 'test-project',
      location: 'us-central1',
    };
    const error = new Error('API error');
    vi.mocked(googleCloudHttpClient.listResourceBackupConfigs).mockRejectedValue(error);

    const result = await listResourceBackupConfigs(params);

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: 'API error',
          }),
        },
      ],
    });
  });
});
