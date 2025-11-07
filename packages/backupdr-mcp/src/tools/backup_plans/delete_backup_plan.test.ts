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
import { deleteBackupPlan, registerDeleteBackupPlanTool } from './delete_backup_plan.js';
import { apiClientFactory } from '../../utility/api_client_factory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

vi.mock('../../utility/api_client_factory.js');
vi.mock('@modelcontextprotocol/sdk/server/mcp.js');

describe('deleteBackupPlan', () => {
  it('should delete a backup plan', async () => {
    const mockPromise = vi.fn().mockResolvedValue(undefined);
    const mockOperation = {
      promise: mockPromise,
    };
    const mockDeleteBackupPlan = vi.fn().mockResolvedValue([mockOperation]);
    const mockBackupDRClient = {
      deleteBackupPlan: mockDeleteBackupPlan,
    };

    (apiClientFactory.getBackupDRClient as Mock).mockReturnValue(mockBackupDRClient);

    const result = await deleteBackupPlan({
      project_id: 'test-project',
      location: 'us-central1',
      backup_plan_name: 'plan-1',
    });

    expect(apiClientFactory.getBackupDRClient).toHaveBeenCalled();
    expect(mockDeleteBackupPlan).toHaveBeenCalledWith({
      name: 'projects/test-project/locations/us-central1/backupPlans/plan-1',
    });
    expect(result.content).toEqual([{ type: 'text', text: 'Backup plan plan-1 deleted.' }]);
  });

  it('should handle errors gracefully', async () => {
    const errorMessage = 'API Error';
    const mockDeleteBackupPlan = vi.fn().mockRejectedValue(new Error(errorMessage));
    const mockBackupDRClient = {
      deleteBackupPlan: mockDeleteBackupPlan,
    };

    (apiClientFactory.getBackupDRClient as Mock).mockReturnValue(mockBackupDRClient);

    const result = await deleteBackupPlan({
      project_id: 'test-project',
      location: 'us-central1',
      backup_plan_name: 'plan-1',
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

describe('registerDeleteBackupPlanTool', () => {
  it('should register the delete_backup_plan tool with the server', () => {
    const mockServer = {
      registerTool: vi.fn(),
    } as unknown as McpServer;
    registerDeleteBackupPlanTool(mockServer);

    expect(mockServer.registerTool).toHaveBeenCalledWith(
      'delete_backup_plan',
      expect.any(Object),
      deleteBackupPlan,
    );
  });
});
