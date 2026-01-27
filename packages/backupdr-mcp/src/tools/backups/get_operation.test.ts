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

import { describe, it, expect, vi, Mock, beforeEach } from 'vitest';
import { getOperation } from './get_operation.js';
import { apiClientFactory } from '../../utility/api_client_factory.js';
import { protos } from '@google-cloud/backupdr';

vi.mock('../../utility/api_client_factory.js');

describe('getOperation', () => {
  const mockGetOperation = vi.fn();
  const mockBackupDRClient = {
    getOperation: mockGetOperation,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (apiClientFactory.getBackupDRClient as Mock).mockReturnValue(mockBackupDRClient);
  });

  it('should call operationsClient.getOperation and return result', async () => {
    const params = {
      name: 'projects/p1/locations/l1/operations/op1',
    };
    const expectedResult = protos.google.longrunning.Operation.create({
      name: params.name,
      done: true,
    });

    mockGetOperation.mockResolvedValue([expectedResult]);

    const result = await getOperation(params);

    expect(mockGetOperation).toHaveBeenCalledWith({
      name: params.name,
    });
    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: JSON.stringify(expectedResult, null, 2),
        },
      ],
    });
  });

  it('should return error if operationsClient.getOperation fails', async () => {
    const params = {
      name: 'projects/p1/locations/l1/operations/op1',
    };
    const error = new Error('Failed to get operation');
    mockGetOperation.mockRejectedValue(error);

    const result = await getOperation(params);

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: 'Failed to get operation',
          }),
        },
      ],
    });
  });
});
