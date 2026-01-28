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
import { getCsqlOperation } from './get_csql_operation.js';
import { googleCloudHttpClient } from '../../utility/gcp_http_client.js';

vi.mock('../../utility/gcp_http_client', () => ({
  googleCloudHttpClient: {
    getCsqlOperation: vi.fn(),
  },
}));

describe('getCsqlOperation', () => {
  it('should call googleCloudHttpClient.getCsqlOperation and return result with empty metadata', async () => {
    const params = {
      project: 'test-project',
      operation_name: 'op-123',
    };
    const mockResponse = { name: 'op-123', status: 'DONE', metadata: { some: 'metadata' } };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(googleCloudHttpClient.getCsqlOperation).mockResolvedValue(mockResponse as any);

    const result = await getCsqlOperation(params);

    expect(googleCloudHttpClient.getCsqlOperation).toHaveBeenCalledWith('test-project', 'op-123');

    const expectedOutput = { name: 'op-123', status: 'DONE', metadata: {} };
    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: JSON.stringify(expectedOutput, null, 2),
        },
      ],
    });
  });

  it('should return error if googleCloudHttpClient.getCsqlOperation fails', async () => {
    const params = {
      project: 'test-project',
      operation_name: 'op-123',
    };
    const error = new Error('Failed to get operation');
    vi.mocked(googleCloudHttpClient.getCsqlOperation).mockRejectedValue(error);

    const result = await getCsqlOperation(params);

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
