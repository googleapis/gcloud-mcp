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
import { createBackupVault, registerCreateBackupVaultTool } from './create_backup_vault.js';
import { apiClientFactory } from '../../utility/api_client_factory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

vi.mock('../../utility/api_client_factory.js');
vi.mock('@modelcontextprotocol/sdk/server/mcp.js');

describe('createBackupVault', () => {
  it('should create a backup vault', async () => {
    const mockResponse = { name: 'vault-1' };
    const mockPromise = vi.fn().mockResolvedValue([mockResponse]);
    const mockOperation = {
      promise: mockPromise,
    };
    const mockCreateBackupVault = vi.fn().mockResolvedValue([mockOperation]);
    const mockBackupDRClient = {
      createBackupVault: mockCreateBackupVault,
    };

    (apiClientFactory.getBackupDRClient as Mock).mockReturnValue(mockBackupDRClient);

    const result = await createBackupVault({
      project_id: 'test-project',
      location: 'us-central1',
      backup_vault_name: 'new-vault',
      description: 'test vault',
      minimum_retention_days: 1,
    });

    expect(apiClientFactory.getBackupDRClient).toHaveBeenCalled();
    expect(mockCreateBackupVault).toHaveBeenCalledWith({
      parent: 'projects/test-project/locations/us-central1',
      backupVaultId: 'new-vault',
      backupVault: {
        description: 'test vault',
        backupMinimumEnforcedRetentionDuration: {
          seconds: 86400,
          nanos: 0,
        },
      },
    });
    expect(result.content).toEqual([{ type: 'text', text: JSON.stringify(mockResponse, null, 2) }]);
  });

  it('should handle errors gracefully', async () => {
    const errorMessage = 'API Error';
    const mockCreateBackupVault = vi.fn().mockRejectedValue(new Error(errorMessage));
    const mockBackupDRClient = {
      createBackupVault: mockCreateBackupVault,
    };

    (apiClientFactory.getBackupDRClient as Mock).mockReturnValue(mockBackupDRClient);

    const result = await createBackupVault({
      project_id: 'test-project',
      location: 'us-central1',
      backup_vault_name: 'new-vault',
      minimum_retention_days: 1,
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

describe('registerCreateBackupVaultTool', () => {
  it('should register the create_backup_vault tool with the server', () => {
    const mockServer = {
      registerTool: vi.fn(),
    } as unknown as McpServer;
    registerCreateBackupVaultTool(mockServer);

    expect(mockServer.registerTool).toHaveBeenCalledWith(
      'create_backup_vault',
      expect.any(Object),
      createBackupVault,
    );
  });
});
