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
  getBackupPlanAssociation,
  registerGetBackupPlanAssociationTool,
} from './get_backup_plan_association.js';
import { apiClientFactory } from '../../utility/api_client_factory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

vi.mock('../../utility/api_client_factory.js');
vi.mock('@modelcontextprotocol/sdk/server/mcp.js');

describe('getBackupPlanAssociation', () => {
  it('should get a backup plan association', async () => {
    const mockResponse = { name: 'assoc-1' };
    const mockGetBackupPlanAssociation = vi.fn().mockResolvedValue([mockResponse]);
    const mockBackupDRClient = {
      getBackupPlanAssociation: mockGetBackupPlanAssociation,
    };

    (apiClientFactory.getBackupDRClient as Mock).mockReturnValue(mockBackupDRClient);

    const result = await getBackupPlanAssociation({
      project_id: 'test-project',
      location: 'us-central1',
      backup_plan_association_id: 'assoc-1',
    });

    expect(apiClientFactory.getBackupDRClient).toHaveBeenCalled();
    expect(mockGetBackupPlanAssociation).toHaveBeenCalledWith({
      name: 'projects/test-project/locations/us-central1/backupPlanAssociations/assoc-1',
    });
    expect(result.content).toEqual([{ type: 'text', text: JSON.stringify(mockResponse, null, 2) }]);
  });

  it('should handle errors gracefully', async () => {
    const errorMessage = 'API Error';
    const mockGetBackupPlanAssociation = vi.fn().mockRejectedValue(new Error(errorMessage));
    const mockBackupDRClient = {
      getBackupPlanAssociation: mockGetBackupPlanAssociation,
    };

    (apiClientFactory.getBackupDRClient as Mock).mockReturnValue(mockBackupDRClient);

    const result = await getBackupPlanAssociation({
      project_id: 'test-project',
      location: 'us-central1',
      backup_plan_association_id: 'assoc-1',
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

describe('registerGetBackupPlanAssociationTool', () => {
  it('should register the get_backup_plan_association tool with the server', () => {
    const mockServer = {
      registerTool: vi.fn(),
    } as unknown as McpServer;
    registerGetBackupPlanAssociationTool(mockServer);

    expect(mockServer.registerTool).toHaveBeenCalledWith(
      'get_backup_plan_association',
      expect.any(Object),
      getBackupPlanAssociation,
    );
  });
});
