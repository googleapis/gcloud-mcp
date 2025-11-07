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
  createBackupPlanAssociation,
  registerCreateBackupPlanAssociationTool,
} from './create_backup_plan_association.js';
import { apiClientFactory } from '../../utility/api_client_factory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

vi.mock('../../utility/api_client_factory.js');
vi.mock('@modelcontextprotocol/sdk/server/mcp.js');

describe('createBackupPlanAssociation', () => {
  it('should create a backup plan association', async () => {
    const mockResponse = { name: 'assoc-1' };
    const mockPromise = vi.fn().mockResolvedValue([mockResponse]);
    const mockOperation = {
      promise: mockPromise,
    };
    const mockCreateBackupPlanAssociation = vi.fn().mockResolvedValue([mockOperation]);
    const mockBackupDRClient = {
      createBackupPlanAssociation: mockCreateBackupPlanAssociation,
    };

    (apiClientFactory.getBackupDRClient as Mock).mockReturnValue(mockBackupDRClient);

    const result = await createBackupPlanAssociation({
      project_id: 'test-project',
      location: 'us-central1',
      backup_plan_association_id: 'assoc-1',
      resource: 'projects/test-project/locations/us-central1/instances/instance-1',
      backup_plan: 'projects/test-project/locations/us-central1/backupPlans/plan-1',
      resource_type: 'test-resource-type',
    });

    expect(apiClientFactory.getBackupDRClient).toHaveBeenCalled();
    expect(mockCreateBackupPlanAssociation).toHaveBeenCalledWith({
      parent: 'projects/test-project/locations/us-central1',
      backupPlanAssociationId: 'assoc-1',
      backupPlanAssociation: {
        resource: 'projects/test-project/locations/us-central1/instances/instance-1',
        backupPlan: 'projects/test-project/locations/us-central1/backupPlans/plan-1',
        resourceType: 'test-resource-type',
      },
    });
    expect(result.content).toEqual([{ type: 'text', text: JSON.stringify(mockResponse, null, 2) }]);
  });

  it('should handle errors gracefully', async () => {
    const errorMessage = 'API Error';
    const mockCreateBackupPlanAssociation = vi.fn().mockRejectedValue(new Error(errorMessage));
    const mockBackupDRClient = {
      createBackupPlanAssociation: mockCreateBackupPlanAssociation,
    };

    (apiClientFactory.getBackupDRClient as Mock).mockReturnValue(mockBackupDRClient);

    const result = await createBackupPlanAssociation({
      project_id: 'test-project',
      location: 'us-central1',
      backup_plan_association_id: 'assoc-1',
      resource: 'projects/test-project/locations/us-central1/instances/instance-1',
      backup_plan: 'projects/test-project/locations/us-central1/backupPlans/plan-1',
      resource_type: 'test-resource-type',
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

describe('registerCreateBackupPlanAssociationTool', () => {
  it('should register the create_backup_plan_association tool with the server', () => {
    const mockServer = {
      registerTool: vi.fn(),
    } as unknown as McpServer;
    registerCreateBackupPlanAssociationTool(mockServer);

    expect(mockServer.registerTool).toHaveBeenCalledWith(
      'create_backup_plan_association',
      expect.any(Object),
      createBackupPlanAssociation,
    );
  });
});
