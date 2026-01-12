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

// import { DisksClient, InstancesClient } from '@google-cloud/compute';
// import { SqlInstancesServiceClient } from '@google-cloud/sql';
import { beforeEach, describe, expect, it, vi, Mock } from 'vitest';
import { apiClientFactory } from '../../utility/api_client_factory.js';
import { findProtectableResources } from './find_protectable_resources.js';

vi.mock('../../utility/api_client_factory.js');

describe('findProtectableResources', () => {
  const mockCsqlClient = {
    list: vi.fn(),
  };
  const mockComputeClient = {
    aggregatedListAsync: vi.fn(),
  };
  const mockDisksClient = {
    aggregatedListAsync: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (apiClientFactory.getCloudSQLClient as Mock).mockReturnValue(mockCsqlClient);
    (apiClientFactory.getComputeClient as Mock).mockReturnValue(mockComputeClient);
    (apiClientFactory.getDisksClient as Mock).mockReturnValue(mockDisksClient);
  });

  it('should list protectable resources and return them', async () => {
    const mockCsqlInstances = [{ name: 'csql-instance-1' }];
    const mockVms = [{ name: 'vm-1' }];
    const mockDisks = [{ name: 'disk-1' }];

    mockCsqlClient.list.mockResolvedValue([mockCsqlInstances]);
    mockComputeClient.aggregatedListAsync.mockImplementation(async function* () {
      yield ['zones/us-central1-a', { instances: mockVms }];
    });
    mockDisksClient.aggregatedListAsync.mockImplementation(async function* () {
      yield ['zones/us-central1-a', { disks: mockDisks }];
    });

    const result = await findProtectableResources({
      project_id: 'test-project',
    });
    const resultText = (result.content[0] as { text: string }).text;
    const resultObject = JSON.parse(resultText);

    expect(resultObject.csqlInstances).toEqual(mockCsqlInstances);
    expect(resultObject.vms).toEqual(mockVms);
    expect(resultObject.disks).toEqual(mockDisks);
    expect(apiClientFactory.getCloudSQLClient).toHaveBeenCalledTimes(1);
    expect(apiClientFactory.getComputeClient).toHaveBeenCalledTimes(1);
    expect(apiClientFactory.getDisksClient).toHaveBeenCalledTimes(1);
  });

  it('should return an error if the API call fails', async () => {
    const errorMessage = 'API error';
    mockCsqlClient.list.mockRejectedValue(new Error(errorMessage));

    const result = await findProtectableResources({
      project_id: 'test-project',
    });
    const resultText = (result.content[0] as { text: string }).text;
    const resultObject = JSON.parse(resultText);

    expect(resultObject.error).toBe(errorMessage);
  });
});
