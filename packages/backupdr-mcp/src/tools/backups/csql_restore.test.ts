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
import { csqlRestore } from './csql_restore.js';
import { googleCloudHttpClient } from '../../utility/gcp_http_client.js';

vi.mock('../../utility/gcp_http_client', () => ({
  googleCloudHttpClient: {
    csqlRestore: vi.fn(),
  },
}));

describe('csqlRestore', () => {
  it('should call googleCloudHttpClient.csqlRestore and return result', async () => {
    const params = {
      project: 'test-project',
      restore_instance_name: 'test-instance',
      backupdr_backup_name: 'test-backup',
    };
    const expectedResult = { name: 'operation-123' };
    vi.mocked(googleCloudHttpClient.csqlRestore).mockResolvedValue(expectedResult);

    const result = await csqlRestore(params);

    expect(googleCloudHttpClient.csqlRestore).toHaveBeenCalledWith(
      'test-project',
      'test-instance',
      'test-backup',
    );
    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: JSON.stringify(expectedResult, null, 2),
        },
      ],
    });
  });

  it('should return error if googleCloudHttpClient.csqlRestore fails', async () => {
    const params = {
      project: 'test-project',
      restore_instance_name: 'test-instance',
      backupdr_backup_name: 'test-backup',
    };
    const error = new Error('Restore failed');
    vi.mocked(googleCloudHttpClient.csqlRestore).mockRejectedValue(error);

    const result = await csqlRestore(params);

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: 'Restore failed',
          }),
        },
      ],
    });
  });
});
