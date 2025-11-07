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

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { protos } from '@google-cloud/backupdr';
import { z } from 'zod';
import { apiClientFactory } from '../../utility/api_client_factory.js';
import { log } from '../../utility/logger.js';

const dayOfWeekEnum = z.enum([
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
]);

const monthEnum = z.enum([
  'JANUARY',
  'FEBRUARY',
  'MARCH',
  'APRIL',
  'MAY',
  'JUNE',
  'JULY',
  'AUGUST',
  'SEPTEMBER',
  'OCTOBER',
  'NOVEMBER',
  'DECEMBER',
]);

// Schemas based on API documentation
const weekDayOfMonthSchema = z.object({
  day_of_week: dayOfWeekEnum,
  week: z.number().int().min(-1).max(4),
});

const backupWindowSchema = z.object({
  start_hour_of_day: z.number().int().min(0).max(23),
  end_hour_of_day: z.number().int().min(0).max(23),
});

const standardScheduleSchema = z
  .object({
    recurrence_type: z.enum(['HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY']),
    hourly_frequency: z.number().int().min(1).optional(),
    days_of_week: z.array(dayOfWeekEnum).optional(),
    days_of_month: z.array(z.number().int().min(1).max(31)).optional(),
    week_day_of_month: weekDayOfMonthSchema.optional(),
    months: z.array(monthEnum).optional(),
    backup_window: backupWindowSchema.optional(),
    time_zone: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.recurrence_type === 'HOURLY') {
        return data.hourly_frequency !== undefined;
      }
      return true;
    },
    {
      message: 'hourly_frequency is required for HOURLY recurrence type',
      path: ['hourly_frequency'],
    },
  )
  .refine(
    (data) => {
      if (data.recurrence_type === 'WEEKLY') {
        return data.days_of_week !== undefined && data.days_of_week.length > 0;
      }
      return true;
    },
    {
      message: 'days_of_week is required for WEEKLY recurrence type',
      path: ['days_of_week'],
    },
  )
  .refine(
    (data) => {
      if (data.recurrence_type === 'MONTHLY') {
        return (
          (data.days_of_month !== undefined && data.days_of_month.length > 0) ||
          data.week_day_of_month !== undefined
        );
      }
      return true;
    },
    {
      message: 'Either days_of_month or week_day_of_month is required for MONTHLY recurrence type',
      path: ['days_of_month'],
    },
  );

const backupScheduleSchema = z.object({
  standard_schedule: standardScheduleSchema,
});

const backupRuleSchema = z.object({
  rule_id: z.string(),
  retention_days: z
    .number()
    .int()
    .describe(
      'The duration for which backup data will be kept. It is defined in days.' +
        ' The value should be greater than or equal to minimum enforced retention of the backup vault.',
    ),
  backup_schedule: backupScheduleSchema,
});

const inputSchema = {
  project_id: z.string().describe('The ID of the GCP project.'),
  location: z.string().describe('The location of the backup plan.'),
  backup_plan_name: z.string().describe('The name of the backup plan to create.'),
  backup_vault: z
    .string()
    .describe(
      'The full resource name of the backup vault to store backups in (e.g., projects/PROJECT_ID/locations/LOCATION/backupVaults/VAULT_NAME).',
    ),
  backup_rules: z.array(backupRuleSchema).describe('The backup rules for the backup plan.'),
  description: z.string().optional().describe('The description of the backup plan.'),
  labels: z.record(z.string()).optional().describe('The labels for the backup plan.'),
  log_retention_days: z.number().int().optional().describe('The number of days to retain logs.'),
  resource_type: z
    .string()
    .describe('The type of resource to backup (e.g., compute.googleapis.com/Instance).'),
};

type CreateBackupPlanParams = z.infer<z.ZodObject<typeof inputSchema>>;

export async function createBackupPlan(params: CreateBackupPlanParams): Promise<CallToolResult> {
  const toolLogger = log.mcp('createBackupPlan', params);
  try {
    // Validate inputs
    z.object(inputSchema).parse(params);

    const client = apiClientFactory.getBackupDRClient();
    const parent = `projects/${params.project_id}/locations/${params.location}`;
    const backupPlan: protos.google.cloud.backupdr.v1.IBackupPlan = {
      backupVault: params.backup_vault,
      resourceType: params.resource_type,
      backupRules: params.backup_rules.map((rule) => ({
        ruleId: rule.rule_id,
        backupRetentionDays: rule.retention_days,
        standardSchedule: {
          recurrenceType: rule.backup_schedule.standard_schedule?.recurrence_type ?? null,
          hourlyFrequency: rule.backup_schedule.standard_schedule?.hourly_frequency ?? null,
          daysOfWeek:
            rule.backup_schedule.standard_schedule?.days_of_week?.map(
              (d) => protos.google.type.DayOfWeek[d],
            ) ?? null,
          daysOfMonth: rule.backup_schedule.standard_schedule?.days_of_month ?? null,
          weekDayOfMonth: rule.backup_schedule.standard_schedule?.week_day_of_month
            ? {
                dayOfWeek:
                  protos.google.type.DayOfWeek[
                    rule.backup_schedule.standard_schedule.week_day_of_month.day_of_week
                  ],
                week: rule.backup_schedule.standard_schedule.week_day_of_month.week,
              }
            : null,
          months:
            rule.backup_schedule.standard_schedule?.months?.map(
              (m) => protos.google.type.Month[m],
            ) ?? null,
          backupWindow: rule.backup_schedule.standard_schedule?.backup_window
            ? {
                startHourOfDay:
                  rule.backup_schedule.standard_schedule.backup_window.start_hour_of_day,
                endHourOfDay: rule.backup_schedule.standard_schedule.backup_window.end_hour_of_day,
              }
            : null,
          timeZone: rule.backup_schedule.standard_schedule?.time_zone ?? null,
        },
      })),
    };
    if (params.description) {
      backupPlan.description = params.description;
    }
    if (params.labels) {
      backupPlan.labels = params.labels;
    }
    if (params.log_retention_days) {
      backupPlan.logRetentionDays = params.log_retention_days;
    }

    const request: protos.google.cloud.backupdr.v1.ICreateBackupPlanRequest = {
      parent,
      backupPlanId: params.backup_plan_name,
      backupPlan,
    };

    const [operation] = await client.createBackupPlan(request);
    const [response] = await operation.promise();

    toolLogger.info(`Created backup plan.`);

    return {
      content: [{ type: 'text', text: JSON.stringify(response, null, 2) }],
    };
  } catch (e: unknown) {
    const error = e as Error;
    toolLogger.error('Error creating backup plan', error);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: error.message,
          }),
        },
      ],
    };
  }
}

export const registerCreateBackupPlanTool = (server: McpServer) => {
  server.registerTool(
    'create_backup_plan',
    {
      description: 'Creates a new backup plan.',
      inputSchema,
    },
    createBackupPlan,
  );
};
