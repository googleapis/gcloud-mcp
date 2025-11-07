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
import { updateBackupPlan, registerUpdateBackupPlanTool } from './update_backup_plan.js';
import { apiClientFactory } from '../../utility/api_client_factory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

vi.mock('../../utility/api_client_factory.js');
vi.mock('@modelcontextprotocol/sdk/server/mcp.js');

describe('updateBackupPlan', () => {
  it('should update a backup plan', async () => {
    const mockResponse = { name: 'plan-1' };
    const mockPromise = vi.fn().mockResolvedValue([mockResponse]);
    const mockOperation = {
      promise: mockPromise,
    };
    const mockUpdateBackupPlan = vi.fn().mockResolvedValue([mockOperation]);
    const mockBackupDRClient = {
      updateBackupPlan: mockUpdateBackupPlan,
    };

    (apiClientFactory.getBackupDRClient as Mock).mockReturnValue(mockBackupDRClient);

    const result = await updateBackupPlan({
      project_id: 'test-project',
      location: 'us-central1',
      backup_plan_name: 'plan-1',
      description: 'updated test plan',
      backup_rules: [
        {
          rule_id: 'daily',
          retention_days: 14,
          backup_schedule: {
            standard_schedule: {
              recurrence_type: 'DAILY',
            },
          },
        },
      ],
    });

    expect(apiClientFactory.getBackupDRClient).toHaveBeenCalled();
    expect(mockUpdateBackupPlan).toHaveBeenCalledWith({
      backupPlan: {
        name: 'projects/test-project/locations/us-central1/backupPlans/plan-1',
        description: 'updated test plan',
        backupRules: [
          {
            ruleId: 'daily',
            backupRetentionDays: 14,
            standardSchedule: {
              recurrenceType: 'DAILY',
              hourlyFrequency: null,
              daysOfWeek: null,
              daysOfMonth: null,
              weekDayOfMonth: null,
              months: null,
              backupWindow: null,
              timeZone: null,
            },
          },
        ],
      },
      updateMask: {
        paths: ['description', 'backup_rules'],
      },
    });
    expect(result.content).toEqual([{ type: 'text', text: JSON.stringify(mockResponse, null, 2) }]);
  });

  it('should handle errors gracefully', async () => {
    const errorMessage = 'API Error';
    const mockUpdateBackupPlan = vi.fn().mockRejectedValue(new Error(errorMessage));
    const mockBackupDRClient = {
      updateBackupPlan: mockUpdateBackupPlan,
    };

    (apiClientFactory.getBackupDRClient as Mock).mockReturnValue(mockBackupDRClient);

    const result = await updateBackupPlan({
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

describe('registerUpdateBackupPlanTool', () => {
  it('should register the update_backup_plan tool with the server', () => {
    const mockServer = {
      registerTool: vi.fn(),
    } as unknown as McpServer;
    registerUpdateBackupPlanTool(mockServer);

    expect(mockServer.registerTool).toHaveBeenCalledWith(
      'update_backup_plan',
      expect.any(Object),
      updateBackupPlan,
    );
  });
});
