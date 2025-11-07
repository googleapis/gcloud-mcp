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
import { createBackupPlan, registerCreateBackupPlanTool } from './create_backup_plan.js';
import { apiClientFactory } from '../../utility/api_client_factory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { protos } from '@google-cloud/backupdr';

vi.mock('../../utility/api_client_factory.js');
vi.mock('@modelcontextprotocol/sdk/server/mcp.js');

describe('createBackupPlan', () => {
  it('should create a backup plan with standard schedule (formerly cron)', async () => {
    const mockResponse = { name: 'plan-1' };
    const mockPromise = vi.fn().mockResolvedValue([mockResponse]);
    const mockOperation = {
      promise: mockPromise,
    };
    const mockCreateBackupPlan = vi.fn().mockResolvedValue([mockOperation]);
    const mockBackupDRClient = {
      createBackupPlan: mockCreateBackupPlan,
    };

    (apiClientFactory.getBackupDRClient as Mock).mockReturnValue(mockBackupDRClient);

    const result = await createBackupPlan({
      project_id: 'test-project',
      location: 'us-central1',
      backup_plan_name: 'new-plan',
      backup_vault: 'projects/test-project/locations/us-central1/backupVaults/test-vault',
      description: 'test plan',
      resource_type: 'test-resource-type',
      backup_rules: [
        {
          rule_id: 'daily',
          retention_days: 7,
          backup_schedule: {
            standard_schedule: {
              recurrence_type: 'DAILY',
            },
          },
        },
      ],
    });

    expect(apiClientFactory.getBackupDRClient).toHaveBeenCalled();
    expect(mockCreateBackupPlan).toHaveBeenCalledWith({
      parent: 'projects/test-project/locations/us-central1',
      backupPlanId: 'new-plan',
      backupPlan: {
        description: 'test plan',
        backupVault: 'projects/test-project/locations/us-central1/backupVaults/test-vault',
        resourceType: 'test-resource-type',
        backupRules: [
          {
            ruleId: 'daily',
            backupRetentionDays: 7,
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
    });
    expect(result.content).toEqual([{ type: 'text', text: JSON.stringify(mockResponse, null, 2) }]);
  });

  it('should create a backup plan with standard schedule', async () => {
    const mockResponse = { name: 'plan-2' };
    const mockPromise = vi.fn().mockResolvedValue([mockResponse]);
    const mockOperation = {
      promise: mockPromise,
    };
    const mockCreateBackupPlan = vi.fn().mockResolvedValue([mockOperation]);
    const mockBackupDRClient = {
      createBackupPlan: mockCreateBackupPlan,
    };
    (apiClientFactory.getBackupDRClient as Mock).mockReturnValue(mockBackupDRClient);

    const result = await createBackupPlan({
      project_id: 'test-project',
      location: 'us-central1',
      backup_plan_name: 'new-plan-standard',
      backup_vault: 'projects/test-project/locations/us-central1/backupVaults/test-vault',
      description: 'test plan standard',
      labels: { foo: 'bar' },
      log_retention_days: 10,
      resource_type: 'test-resource-type',
      backup_rules: [
        {
          rule_id: 'hourly',
          retention_days: 3,
          backup_schedule: {
            standard_schedule: {
              recurrence_type: 'HOURLY',
              hourly_frequency: 4,
            },
          },
        },
      ],
    });

    expect(mockCreateBackupPlan).toHaveBeenCalledWith({
      parent: 'projects/test-project/locations/us-central1',
      backupPlanId: 'new-plan-standard',
      backupPlan: {
        description: 'test plan standard',
        backupVault: 'projects/test-project/locations/us-central1/backupVaults/test-vault',
        labels: { foo: 'bar' },
        logRetentionDays: 10,
        resourceType: 'test-resource-type',
        backupRules: [
          {
            ruleId: 'hourly',
            backupRetentionDays: 3,
            standardSchedule: {
              recurrenceType: 'HOURLY',
              hourlyFrequency: 4,
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
    });

    expect(result.content).toEqual([{ type: 'text', text: JSON.stringify(mockResponse, null, 2) }]);
  });
  it('should create a backup plan with weekly schedule', async () => {
    const mockResponse = { name: 'plan-3' };
    const mockPromise = vi.fn().mockResolvedValue([mockResponse]);
    const mockOperation = {
      promise: mockPromise,
    };
    const mockCreateBackupPlan = vi.fn().mockResolvedValue([mockOperation]);
    const mockBackupDRClient = {
      createBackupPlan: mockCreateBackupPlan,
    };
    (apiClientFactory.getBackupDRClient as Mock).mockReturnValue(mockBackupDRClient);

    const result = await createBackupPlan({
      project_id: 'test-project',
      location: 'us-central1',
      backup_plan_name: 'new-plan-weekly',
      backup_vault: 'projects/test-project/locations/us-central1/backupVaults/test-vault',
      description: 'test plan weekly',
      resource_type: 'test-resource-type',
      backup_rules: [
        {
          rule_id: 'weekly',
          retention_days: 14,
          backup_schedule: {
            standard_schedule: {
              recurrence_type: 'WEEKLY',
              days_of_week: ['MONDAY', 'FRIDAY'],
              months: ['JANUARY'],
            },
          },
        },
      ],
    });

    expect(mockCreateBackupPlan).toHaveBeenCalledWith({
      parent: 'projects/test-project/locations/us-central1',
      backupPlanId: 'new-plan-weekly',
      backupPlan: {
        description: 'test plan weekly',
        backupVault: 'projects/test-project/locations/us-central1/backupVaults/test-vault',
        resourceType: 'test-resource-type',
        backupRules: [
          {
            ruleId: 'weekly',
            backupRetentionDays: 14,
            standardSchedule: {
              recurrenceType: 'WEEKLY',
              hourlyFrequency: null,
              daysOfWeek: [
                protos.google.type.DayOfWeek.MONDAY,
                protos.google.type.DayOfWeek.FRIDAY,
              ],
              daysOfMonth: null,
              weekDayOfMonth: null,
              months: [protos.google.type.Month.JANUARY],
              backupWindow: null,
              timeZone: null,
            },
          },
        ],
      },
    });

    expect(result.content).toEqual([{ type: 'text', text: JSON.stringify(mockResponse, null, 2) }]);
  });
  it('should handle errors gracefully', async () => {
    const errorMessage = 'API Error';
    const mockCreateBackupPlan = vi.fn().mockRejectedValue(new Error(errorMessage));
    const mockBackupDRClient = {
      createBackupPlan: mockCreateBackupPlan,
    };

    (apiClientFactory.getBackupDRClient as Mock).mockReturnValue(mockBackupDRClient);

    const result = await createBackupPlan({
      project_id: 'test-project',
      location: 'us-central1',
      backup_plan_name: 'new-plan',
      backup_vault: 'projects/test-project/locations/us-central1/backupVaults/test-vault',
      resource_type: 'test-resource-type',
      backup_rules: [
        {
          rule_id: 'daily',
          retention_days: 7,
          backup_schedule: {
            standard_schedule: {
              recurrence_type: 'DAILY',
            },
          },
        },
      ],
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

describe('registerCreateBackupPlanTool', () => {
  it('should register the create_backup_plan tool with the server', () => {
    const mockServer = {
      registerTool: vi.fn(),
    } as unknown as McpServer;
    registerCreateBackupPlanTool(mockServer);

    expect(mockServer.registerTool).toHaveBeenCalledWith(
      'create_backup_plan',
      expect.any(Object),
      createBackupPlan,
    );
  });
});
