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
import { listDataSources, registerListDataSourcesTool } from './list_datasources.js';
import { apiClientFactory } from '../../utility/api_client_factory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

vi.mock('../../utility/api_client_factory.js');
vi.mock('@modelcontextprotocol/sdk/server/mcp.js');

describe('listDataSources', () => {
  it('should return a list of data sources', async () => {
    const mockDataSources = [{ name: 'ds-1' }, { name: 'ds-2' }];
    const mockListDataSources = vi.fn().mockResolvedValue([mockDataSources]);
    const mockBackupDRClient = {
      listDataSources: mockListDataSources,
    };

    (apiClientFactory.getBackupDRClient as Mock).mockReturnValue(mockBackupDRClient);

    const result = await listDataSources({
      project_id: 'test-project',
      location: 'us-central1',
      backup_vault_name: 'test-vault',
    });

    expect(apiClientFactory.getBackupDRClient).toHaveBeenCalled();
    expect(mockListDataSources).toHaveBeenCalledWith({
      parent: 'projects/test-project/locations/us-central1/backupVaults/test-vault',
    });
    expect(result.content).toEqual([
      { type: 'text', text: JSON.stringify(mockDataSources, null, 2) },
    ]);
  });

  it('should return an empty list if no data sources are found', async () => {
    const mockListDataSources = vi.fn().mockResolvedValue([[]]);
    const mockBackupDRClient = {
      listDataSources: mockListDataSources,
    };

    (apiClientFactory.getBackupDRClient as Mock).mockReturnValue(mockBackupDRClient);

    const result = await listDataSources({
      project_id: 'test-project',
      location: 'us-central1',
      backup_vault_name: 'test-vault',
    });

    expect(result.content).toEqual([{ type: 'text', text: '[]' }]);
  });

  it('should handle errors gracefully', async () => {
    const errorMessage = 'API Error';
    const mockListDataSources = vi.fn().mockRejectedValue(new Error(errorMessage));
    const mockBackupDRClient = {
      listDataSources: mockListDataSources,
    };

    (apiClientFactory.getBackupDRClient as Mock).mockReturnValue(mockBackupDRClient);

    const result = await listDataSources({
      project_id: 'test-project',
      location: 'us-central1',
      backup_vault_name: 'test-vault',
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

describe('registerListDataSourcesTool', () => {
  it('should register the list_datasources tool with the server', () => {
    const mockServer = {
      registerTool: vi.fn(),
    } as unknown as McpServer;
    registerListDataSourcesTool(mockServer);

    expect(mockServer.registerTool).toHaveBeenCalledWith(
      'list_datasources',
      expect.any(Object),
      listDataSources,
    );
  });
});
