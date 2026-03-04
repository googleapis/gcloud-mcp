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

import { beforeEach, describe, expect, it, vi, Mock } from 'vitest';
import { csqlRestore } from './csql_restore.js';
import { apiClientFactory } from '../../utility/api_client_factory.js';

vi.mock('../../utility/api_client_factory.js');

describe('csqlRestore', () => {
  const mockCsqlClient = {
    restoreBackup: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (apiClientFactory.getCloudSQLClient as Mock).mockReturnValue(mockCsqlClient);
  });

  it('should call apiClientFactory.getCloudSQLClient and return operation details', async () => {
    const params = {
      project: 'test-project',
      restore_instance_name: 'test-instance',
      backupdr_backup_name: 'test-backup',
    };
    const mockOperation = { name: 'operation-123', metadata: { some: 'data' } };
    mockCsqlClient.restoreBackup.mockResolvedValue([mockOperation]);

    const result = await csqlRestore(params);

    expect(apiClientFactory.getCloudSQLClient).toHaveBeenCalledTimes(1);
    expect(mockCsqlClient.restoreBackup).toHaveBeenCalledWith({
      project: 'test-project',
      instance: 'test-instance',
      body: {
        backupdrBackup: 'test-backup',
      },
    });

    const expectedOutput = { name: 'operation-123', metadata: {} };
    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: JSON.stringify(expectedOutput, null, 2),
        },
      ],
    });
  });

  it('should return error if restoreBackup fails', async () => {
    const params = {
      project: 'test-project',
      restore_instance_name: 'test-instance',
      backupdr_backup_name: 'test-backup',
    };
    const error = new Error('Restore failed');
    mockCsqlClient.restoreBackup.mockRejectedValue(error);

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
