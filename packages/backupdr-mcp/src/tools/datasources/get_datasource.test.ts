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
import { getDataSource, registerGetDataSourceTool } from './get_datasource.js';
import { apiClientFactory } from '../../utility/api_client_factory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

vi.mock('../../utility/api_client_factory.js');
vi.mock('@modelcontextprotocol/sdk/server/mcp.js');

describe('getDataSource', () => {
  it('should return a data source', async () => {
    const mockDataSource = {
      name: 'projects/test-project/locations/us-central1/backupVaults/test-vault/dataSources/ds-1',
    };
    const mockGetDataSource = vi.fn().mockResolvedValue([mockDataSource]);
    const mockBackupDRClient = {
      getDataSource: mockGetDataSource,
    };

    (apiClientFactory.getBackupDRClient as Mock).mockReturnValue(mockBackupDRClient);

    const result = await getDataSource({
      project_id: 'test-project',
      location: 'us-central1',
      backup_vault_name: 'test-vault',
      datasource_name: 'ds-1',
    });

    expect(apiClientFactory.getBackupDRClient).toHaveBeenCalled();
    expect(mockGetDataSource).toHaveBeenCalledWith({
      name: 'projects/test-project/locations/us-central1/backupVaults/test-vault/dataSources/ds-1',
    });
    expect(result.content).toEqual([
      { type: 'text', text: JSON.stringify(mockDataSource, null, 2) },
    ]);
  });

  it('should handle errors gracefully', async () => {
    const errorMessage = 'API Error';
    const mockGetDataSource = vi.fn().mockRejectedValue(new Error(errorMessage));
    const mockBackupDRClient = {
      getDataSource: mockGetDataSource,
    };

    (apiClientFactory.getBackupDRClient as Mock).mockReturnValue(mockBackupDRClient);

    const result = await getDataSource({
      project_id: 'test-project',
      location: 'us-central1',
      backup_vault_name: 'test-vault',
      datasource_name: 'ds-1',
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

describe('registerGetDataSourceTool', () => {
  it('should register the get_datasource tool with the server', () => {
    const mockServer = {
      registerTool: vi.fn(),
    } as unknown as McpServer;
    registerGetDataSourceTool(mockServer);

    expect(mockServer.registerTool).toHaveBeenCalledWith(
      'get_datasource',
      expect.any(Object),
      getDataSource,
    );
  });
});
