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
  deleteBackupPlanAssociation,
  registerDeleteBackupPlanAssociationTool,
} from './delete_backup_plan_association.js';
import { apiClientFactory } from '../../utility/api_client_factory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

vi.mock('../../utility/api_client_factory.js');
vi.mock('@modelcontextprotocol/sdk/server/mcp.js');

describe('deleteBackupPlanAssociation', () => {
  it('should delete a backup plan association', async () => {
    const mockPromise = vi.fn().mockResolvedValue(undefined);
    const mockOperation = {
      promise: mockPromise,
    };
    const mockDeleteBackupPlanAssociation = vi.fn().mockResolvedValue([mockOperation]);
    const mockBackupDRClient = {
      deleteBackupPlanAssociation: mockDeleteBackupPlanAssociation,
    };

    (apiClientFactory.getBackupDRClient as Mock).mockReturnValue(mockBackupDRClient);

    const result = await deleteBackupPlanAssociation({
      project_id: 'test-project',
      location: 'us-central1',
      backup_plan_association_id: 'assoc-1',
    });

    expect(apiClientFactory.getBackupDRClient).toHaveBeenCalled();
    expect(mockDeleteBackupPlanAssociation).toHaveBeenCalledWith({
      name: 'projects/test-project/locations/us-central1/backupPlanAssociations/assoc-1',
    });
    expect(result.content).toEqual([
      {
        type: 'text',
        text: `Successfully deleted backup plan association assoc-1`,
      },
    ]);
  });

  it('should handle errors gracefully', async () => {
    const errorMessage = 'API Error';
    const mockDeleteBackupPlanAssociation = vi.fn().mockRejectedValue(new Error(errorMessage));
    const mockBackupDRClient = {
      deleteBackupPlanAssociation: mockDeleteBackupPlanAssociation,
    };

    (apiClientFactory.getBackupDRClient as Mock).mockReturnValue(mockBackupDRClient);

    const result = await deleteBackupPlanAssociation({
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

describe('registerDeleteBackupPlanAssociationTool', () => {
  it('should register the delete_backup_plan_association tool with the server', () => {
    const mockServer = {
      registerTool: vi.fn(),
    } as unknown as McpServer;
    registerDeleteBackupPlanAssociationTool(mockServer);

    expect(mockServer.registerTool).toHaveBeenCalledWith(
      'delete_backup_plan_association',
      expect.any(Object),
      deleteBackupPlanAssociation,
    );
  });
});
