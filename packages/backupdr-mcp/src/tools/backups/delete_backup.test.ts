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
import { describe, it, expect, vi, Mock } from 'vitest';
import { deleteBackup, registerDeleteBackupTool } from './delete_backup.js';
import { apiClientFactory } from '../../utility/api_client_factory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

vi.mock('../../utility/api_client_factory.js');
vi.mock('@modelcontextprotocol/sdk/server/mcp.js');

describe('deleteBackup', () => {
  it('should delete a backup', async () => {
    const mockPromise = vi.fn().mockResolvedValue(undefined);
    const mockOperation = {
      promise: mockPromise,
    };
    const mockDeleteBackup = vi.fn().mockResolvedValue([mockOperation]);
    const mockBackupDRClient = {
      deleteBackup: mockDeleteBackup,
    };

    (apiClientFactory.getBackupDRClient as Mock).mockReturnValue(mockBackupDRClient);

    const result = await deleteBackup({
      project_id: 'test-project',
      location: 'us-central1',
      backup_vault_name: 'test-vault',
      datasource_name: 'test-ds',
      backup_name: 'backup-1',
    });

    expect(apiClientFactory.getBackupDRClient).toHaveBeenCalled();
    expect(mockDeleteBackup).toHaveBeenCalledWith({
      name: 'projects/test-project/locations/us-central1/backupVaults/test-vault/dataSources/test-ds/backups/backup-1',
    });
    expect(result.content).toEqual([{ type: 'text', text: 'Backup backup-1 deleted.' }]);
  });

  it('should handle errors gracefully', async () => {
    const errorMessage = 'API Error';
    const mockDeleteBackup = vi.fn().mockRejectedValue(new Error(errorMessage));
    const mockBackupDRClient = {
      deleteBackup: mockDeleteBackup,
    };

    (apiClientFactory.getBackupDRClient as Mock).mockReturnValue(mockBackupDRClient);

    const result = await deleteBackup({
      project_id: 'test-project',
      location: 'us-central1',
      backup_vault_name: 'test-vault',
      datasource_name: 'test-ds',
      backup_name: 'backup-1',
    });

    expect(result.content).toEqual([
      {
        type: 'text',
        text: JSON.stringify({
          error: errorMessage,
        }),
      },
    ]);
  });
});

describe('registerDeleteBackupTool', () => {
  it('should register the delete_backup tool with the server', () => {
    const mockServer = {
      registerTool: vi.fn(),
    } as unknown as McpServer;
    registerDeleteBackupTool(mockServer);

    expect(mockServer.registerTool).toHaveBeenCalledWith(
      'delete_backup',
      expect.any(Object),
      deleteBackup,
    );
  });
});
