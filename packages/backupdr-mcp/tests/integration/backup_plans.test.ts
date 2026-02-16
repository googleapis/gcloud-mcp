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

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { expectSuccess } from './helpers.js';
import { createBackupVault } from '../../src/tools/backup_vaults/create_backup_vault.js';
import { deleteBackupVault } from '../../src/tools/backup_vaults/delete_backup_vault.js';
import { createBackupPlan } from '../../src/tools/backup_plans/create_backup_plan.js';
import { deleteBackupPlan } from '../../src/tools/backup_plans/delete_backup_plan.js';
import { getBackupPlan } from '../../src/tools/backup_plans/get_backup_plan.js';
import { listBackupPlans } from '../../src/tools/backup_plans/list_backup_plans.js';
import { updateBackupPlan } from '../../src/tools/backup_plans/update_backup_plan.js';

const projectId = process.env['GOOGLE_CLOUD_PROJECT'] || process.env['GCP_PROJECT_ID'];
const location = 'us-central1';

if (!projectId) {
  throw new Error('GOOGLE_CLOUD_PROJECT or GCP_PROJECT_ID environment variable not set');
}

const timestamp = Date.now();
const vaultName = `plan-test-vault-${timestamp}`;
const fullVaultName = `projects/${projectId}/locations/${location}/backupVaults/${vaultName}`;

const planName = `test-plan-${timestamp}`;
const fullPlanName = `projects/${projectId}/locations/${location}/backupPlans/${planName}`;

describe('Backup Plans Integration Tests', () => {
  beforeAll(async () => {
    // 1. Ensure cleanup of previous potential leftovers
    try {
      await deleteBackupPlan({
        project_id: projectId,
        location,
        backup_plan_name: planName,
      });
    } catch (_e) {}

    try {
      await deleteBackupVault({
        project_id: projectId,
        location,
        backup_vault_name: vaultName,
      });
    } catch (_e) {}

    // 2. Create prerequisite Vault
    await expectSuccess(
      createBackupVault({
        project_id: projectId,
        location,
        backup_vault_name: vaultName,
        description: 'Prerequisite Vault for Plan Tests',
        minimum_retention_days: 1,
      }),
    );
  }, 300000);

  afterAll(async () => {
    // Cleanup in reverse order
    try {
      await deleteBackupPlan({
        project_id: projectId,
        location,
        backup_plan_name: planName,
      });
    } catch (_e) {}

    try {
      await deleteBackupVault({
        project_id: projectId,
        location,
        backup_vault_name: vaultName,
      });
    } catch (_e) {}
  }, 300000);

  it('should create a backup plan', async () => {
    const result = (await expectSuccess(
      createBackupPlan({
        project_id: projectId,
        location,
        backup_plan_name: planName,
        backup_vault: fullVaultName,
        description: 'Test Backup Plan',
        resource_type: 'compute.googleapis.com/Instance',
        backup_rules: [
          {
            rule_id: 'rule-1',
            retention_days: 1,
            backup_schedule: {
              standard_schedule: {
                recurrence_type: 'DAILY',
                time_zone: 'UTC',
                backup_window: {
                  start_hour_of_day: 0,
                  end_hour_of_day: 6,
                },
              },
            },
          },
        ],
      }),
    )) as any;

    expect(result.name).toBe(fullPlanName);
  }, 300000);

  it('should get a backup plan', async () => {
    const result = (await expectSuccess(
      getBackupPlan({
        project_id: projectId,
        location,
        backup_plan_name: planName,
      }),
    )) as any;

    expect(result.name).toBe(fullPlanName);
    expect(result.description).toBe('Test Backup Plan');
  }, 300000);

  it('should update a backup plan', async () => {
    const result = (await expectSuccess(
      updateBackupPlan({
        project_id: projectId,
        location,
        backup_plan_name: planName,
        description: 'Updated Test Backup Plan',
      }),
    )) as any;

    expect(result.description).toBe('Updated Test Backup Plan');
  }, 300000);

  it('should list backup plans', async () => {
    const plans = (await expectSuccess(
      listBackupPlans({
        project_id: projectId,
        location,
      }),
    )) as any[];

    const planNames = plans.map((p) => p.name);
    expect(planNames).toContain(fullPlanName);
  }, 300000);

  it('should delete a backup plan', async () => {
    const result = await expectSuccess(
      deleteBackupPlan({
        project_id: projectId,
        location,
        backup_plan_name: planName,
      }),
    );

    expect(result).toBe(`Backup plan ${planName} deleted.`);

    // Verify deletion
    const getResult = await getBackupPlan({
      project_id: projectId,
      location,
      backup_plan_name: planName,
    });

    expect(JSON.stringify(getResult.content)).toContain('not found');
  }, 300000);
});
