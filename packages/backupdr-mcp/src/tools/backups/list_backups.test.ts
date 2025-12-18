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
import { listBackups, registerListBackupsTool } from './list_backups.js';
import { apiClientFactory } from '../../utility/api_client_factory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

vi.mock('../../utility/api_client_factory.js');
vi.mock('@modelcontextprotocol/sdk/server/mcp.js');

describe('listBackups', () => {
  it('should return a list of backups', async () => {
    const mockBackups = [{ name: 'backup-1' }, { name: 'backup-2' }];
    const mockListBackups = vi.fn().mockResolvedValue([mockBackups]);
    const mockBackupDRClient = {
      listBackups: mockListBackups,
    };

    (apiClientFactory.getBackupDRClient as Mock).mockReturnValue(mockBackupDRClient);

    const result = await listBackups({
      project_id: 'test-project',
      location: 'us-central1',
      backup_vault_name: 'test-vault',
      datasource_name: 'test-ds',
    });

    expect(apiClientFactory.getBackupDRClient).toHaveBeenCalled();
    expect(mockListBackups).toHaveBeenCalledWith({
      parent:
        'projects/test-project/locations/us-central1/backupVaults/test-vault/dataSources/test-ds',
    });
    expect(result.content).toEqual([{ type: 'text', text: JSON.stringify(mockBackups, null, 2) }]);
  });

  it('should return an empty list if no backups are found', async () => {
    const mockListBackups = vi.fn().mockResolvedValue([[]]);
    const mockBackupDRClient = {
      listBackups: mockListBackups,
    };

    (apiClientFactory.getBackupDRClient as Mock).mockReturnValue(mockBackupDRClient);

    const result = await listBackups({
      project_id: 'test-project',
      location: 'us-central1',
      backup_vault_name: 'test-vault',
      datasource_name: 'test-ds',
    });

    expect(result.content).toEqual([{ type: 'text', text: '[]' }]);
  });

  it('should handle errors gracefully', async () => {
    const errorMessage = 'API Error';
    const mockListBackups = vi.fn().mockRejectedValue(new Error(errorMessage));
    const mockBackupDRClient = {
      listBackups: mockListBackups,
    };

    (apiClientFactory.getBackupDRClient as Mock).mockReturnValue(mockBackupDRClient);

    const result = await listBackups({
      project_id: 'test-project',
      location: 'us-central1',
      backup_vault_name: 'test-vault',
      datasource_name: 'test-ds',
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

describe('registerListBackupsTool', () => {
  it('should register the list_backups tool with the server', () => {
    const mockServer = {
      registerTool: vi.fn(),
    } as unknown as McpServer;
    registerListBackupsTool(mockServer);

    expect(mockServer.registerTool).toHaveBeenCalledWith(
      'list_backups',
      expect.any(Object),
      listBackups,
    );
  });
});
