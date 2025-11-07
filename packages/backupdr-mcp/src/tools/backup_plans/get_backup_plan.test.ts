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
import { getBackupPlan, registerGetBackupPlanTool } from './get_backup_plan.js';
import { apiClientFactory } from '../../utility/api_client_factory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

vi.mock('../../utility/api_client_factory.js');
vi.mock('@modelcontextprotocol/sdk/server/mcp.js');

describe('getBackupPlan', () => {
  it('should return a backup plan', async () => {
    const mockPlan = {
      name: 'projects/test-project/locations/us-central1/backupPlans/plan-1',
    };
    const mockGetBackupPlan = vi.fn().mockResolvedValue([mockPlan]);
    const mockBackupDRClient = {
      getBackupPlan: mockGetBackupPlan,
    };

    (apiClientFactory.getBackupDRClient as Mock).mockReturnValue(mockBackupDRClient);

    const result = await getBackupPlan({
      project_id: 'test-project',
      location: 'us-central1',
      backup_plan_name: 'plan-1',
    });

    expect(apiClientFactory.getBackupDRClient).toHaveBeenCalled();
    expect(mockGetBackupPlan).toHaveBeenCalledWith({
      name: 'projects/test-project/locations/us-central1/backupPlans/plan-1',
    });
    expect(result.content).toEqual([{ type: 'text', text: JSON.stringify(mockPlan, null, 2) }]);
  });

  it('should handle errors gracefully', async () => {
    const errorMessage = 'API Error';
    const mockGetBackupPlan = vi.fn().mockRejectedValue(new Error(errorMessage));
    const mockBackupDRClient = {
      getBackupPlan: mockGetBackupPlan,
    };

    (apiClientFactory.getBackupDRClient as Mock).mockReturnValue(mockBackupDRClient);

    const result = await getBackupPlan({
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

describe('registerGetBackupPlanTool', () => {
  it('should register the get_backup_plan tool with the server', () => {
    const mockServer = {
      registerTool: vi.fn(),
    } as unknown as McpServer;
    registerGetBackupPlanTool(mockServer);

    expect(mockServer.registerTool).toHaveBeenCalledWith(
      'get_backup_plan',
      expect.any(Object),
      getBackupPlan,
    );
  });
});
