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
import {
  listBackupPlanAssociations,
  registerListBackupPlanAssociationsTool,
} from './list_backup_plan_associations.js';
import { apiClientFactory } from '../../utility/api_client_factory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

vi.mock('../../utility/api_client_factory.js');
vi.mock('@modelcontextprotocol/sdk/server/mcp.js');

describe('listBackupPlanAssociations', () => {
  it('should list backup plan associations', async () => {
    const mockResponse = [{ name: 'assoc-1' }];
    const mockListBackupPlanAssociations = vi.fn().mockResolvedValue([mockResponse]);
    const mockBackupDRClient = {
      listBackupPlanAssociations: mockListBackupPlanAssociations,
    };

    (apiClientFactory.getBackupDRClient as Mock).mockReturnValue(mockBackupDRClient);

    const result = await listBackupPlanAssociations({
      project_id: 'test-project',
      location: 'us-central1',
      filter: 'test-filter',
      page_size: 10,
      page_token: 'test-token',
    });

    expect(apiClientFactory.getBackupDRClient).toHaveBeenCalled();
    expect(mockListBackupPlanAssociations).toHaveBeenCalledWith({
      parent: 'projects/test-project/locations/us-central1',
      filter: 'test-filter',
      pageSize: 10,
      pageToken: 'test-token',
    });
    expect(result.content).toEqual([{ type: 'text', text: JSON.stringify(mockResponse, null, 2) }]);
  });

  it('should handle errors gracefully', async () => {
    const errorMessage = 'API Error';
    const mockListBackupPlanAssociations = vi.fn().mockRejectedValue(new Error(errorMessage));
    const mockBackupDRClient = {
      listBackupPlanAssociations: mockListBackupPlanAssociations,
    };

    (apiClientFactory.getBackupDRClient as Mock).mockReturnValue(mockBackupDRClient);

    const result = await listBackupPlanAssociations({
      project_id: 'test-project',
      location: 'us-central1',
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

describe('registerListBackupPlanAssociationsTool', () => {
  it('should register the list_backup_plan_associations tool with the server', () => {
    const mockServer = {
      registerTool: vi.fn(),
    } as unknown as McpServer;
    registerListBackupPlanAssociationsTool(mockServer);

    expect(mockServer.registerTool).toHaveBeenCalledWith(
      'list_backup_plan_associations',
      expect.any(Object),
      listBackupPlanAssociations,
    );
  });
});
