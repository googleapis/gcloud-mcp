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
import { listBackupVaults, registerListBackupVaultsTool } from './list_backup_vaults.js';
import { apiClientFactory } from '../../utility/api_client_factory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

vi.mock('../../utility/api_client_factory.js');
vi.mock('@modelcontextprotocol/sdk/server/mcp.js');

describe('listBackupVaults', () => {
  it('should return a list of backup vaults', async () => {
    const mockVaults = [{ name: 'vault-1' }, { name: 'vault-2' }];
    const mockListBackupVaults = vi.fn().mockResolvedValue([mockVaults]);
    const mockBackupDRClient = {
      listBackupVaults: mockListBackupVaults,
    };

    (apiClientFactory.getBackupDRClient as Mock).mockReturnValue(mockBackupDRClient);

    const result = await listBackupVaults({ project_id: 'test-project', location: 'us-central1' });

    expect(apiClientFactory.getBackupDRClient).toHaveBeenCalled();
    expect(mockListBackupVaults).toHaveBeenCalledWith({
      parent: 'projects/test-project/locations/us-central1',
    });
    expect(result.content).toEqual([{ type: 'text', text: JSON.stringify(mockVaults, null, 2) }]);
  });

  it('should return an empty list if no vaults are found', async () => {
    const mockListBackupVaults = vi.fn().mockResolvedValue([[]]);
    const mockBackupDRClient = {
      listBackupVaults: mockListBackupVaults,
    };

    (apiClientFactory.getBackupDRClient as Mock).mockReturnValue(mockBackupDRClient);

    const result = await listBackupVaults({ project_id: 'test-project', location: 'us-central1' });

    expect(result.content).toEqual([{ type: 'text', text: '[]' }]);
  });

  it('should handle errors gracefully', async () => {
    const errorMessage = 'API Error';
    const mockListBackupVaults = vi.fn().mockRejectedValue(new Error(errorMessage));
    const mockBackupDRClient = {
      listBackupVaults: mockListBackupVaults,
    };

    (apiClientFactory.getBackupDRClient as Mock).mockReturnValue(mockBackupDRClient);

    const result = await listBackupVaults({ project_id: 'test-project', location: 'us-central1' });

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

describe('registerListBackupVaultsTool', () => {
  it('should register the list_backup_vaults tool with the server', () => {
    const mockServer = {
      registerTool: vi.fn(),
    } as unknown as McpServer;
    registerListBackupVaultsTool(mockServer);

    expect(mockServer.registerTool).toHaveBeenCalledWith(
      'list_backup_vaults',
      expect.any(Object),
      listBackupVaults,
    );
  });
});
