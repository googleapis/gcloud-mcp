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

/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { exec, execSync } from 'node:child_process';
import { promisify } from 'node:util';
import { expectSuccess, triggerBackupForAssociation } from './helpers.js';

const execAsync = promisify(exec);
import { createBackupVault } from '../../src/tools/backup_vaults/create_backup_vault.js';
import { getBackupVault } from '../../src/tools/backup_vaults/get_backup_vault.js';
import { createBackupPlan } from '../../src/tools/backup_plans/create_backup_plan.js';
import { deleteBackupPlan } from '../../src/tools/backup_plans/delete_backup_plan.js';
import { createBackupPlanAssociation } from '../../src/tools/backup_plan_associations/create_backup_plan_association.js';
import { deleteBackupPlanAssociation } from '../../src/tools/backup_plan_associations/delete_backup_plan_association.js';
import { listDataSources } from '../../src/tools/datasources/list_datasources.js';
import { listBackups } from '../../src/tools/backups/list_backups.js';
import { restoreBackup } from '../../src/tools/backups/restore_backup.js';
import { getOperation } from '../../src/tools/backups/get_operation.js';
import { csqlRestore } from '../../src/tools/backups/csql_restore.js';
import { getCsqlOperation } from '../../src/tools/backups/get_csql_operation.js';

const projectId = process.env['GOOGLE_CLOUD_PROJECT'] || process.env['GCP_PROJECT_ID'];
const location = 'us-central1';
const zone = 'us-central1-a';

if (!projectId) {
  throw new Error('GOOGLE_CLOUD_PROJECT or GCP_PROJECT_ID environment variable not set');
}

/**
 * Helper to wait for a long-running operation to complete.
 */
async function waitForOperation(name: string) {
  console.log(`Waiting for operation: ${name}`);
  for (let i = 0; i < 60; i++) {
    const op = (await expectSuccess(getOperation({ name }))) as any;
    if (op.done) {
      if (op.error) {
        throw new Error(`Operation failed: ${op.error.message}`);
      }
      return op;
    }
    await new Promise((resolve) => setTimeout(resolve, 20000));
  }
  throw new Error(`Operation ${name} timed out`);
}

/**
 * Helper to wait for a Cloud SQL operation to complete.
 */
async function waitForCsqlOperation(project: string, operationName: string) {
  console.log(`Waiting for Cloud SQL operation: ${operationName}`);
  for (let i = 0; i < 60; i++) {
    const op = (await expectSuccess(
      getCsqlOperation({ project, operation_name: operationName }),
    )) as any;
    if (op.status === 'DONE') {
      if (op.error) {
        throw new Error(`Cloud SQL operation failed: ${JSON.stringify(op.error)}`);
      }
      return op;
    }
    await new Promise((resolve) => setTimeout(resolve, 20000));
  }
  throw new Error(`Cloud SQL operation ${operationName} timed out`);
}

const timestamp = Date.now();
const vaultName = `wf-vault-${timestamp}`;
const fullVaultName = `projects/${projectId}/locations/${location}/backupVaults/${vaultName}`;

const planName = `wf-plan-${timestamp}`;
const fullPlanName = `projects/${projectId}/locations/${location}/backupPlans/${planName}`;

const assocId = `wf-assoc-${timestamp}`;

const vmName = `wf-vm-${timestamp}`;
const restoreInstanceName = `rest-wf-${timestamp}`;

const diskName = `wf-disk-${timestamp}`;
const restoreDiskName = `rest-disk-${timestamp}`;

const targetResource = `projects/${projectId}/zones/${zone}/instances/${vmName}`;
const resourceType = 'compute.googleapis.com/Instance';

const targetDiskResource = `projects/${projectId}/zones/${zone}/disks/${diskName}`;
const diskResourceType = 'compute.googleapis.com/Disk';

const csqlName = `wf-csql-${timestamp}`;
const restoreCsqlName = `rest-csql-${timestamp}`;
const targetCsqlResource = `projects/${projectId}/instances/${csqlName}`;
const csqlResourceType = 'sqladmin.googleapis.com/Instance';

const ruleId = 'rule-1';

describe('BackupDR Full Workflow Integration Test', () => {
  beforeAll(async () => {
    // 1. Create a VM, Disk and Cloud SQL instances for testing
    console.log(
      `Creating VM: ${vmName}, Disk: ${diskName} and CSQL: ${csqlName}, ${restoreCsqlName}`,
    );
    execSync(
      `gcloud compute instances create ${vmName} --project=${projectId} --zone=${zone} --machine-type=e2-micro --image-family=debian-12 --image-project=debian-cloud --quiet`,
    );
    execSync(
      `gcloud compute disks create ${diskName} --project=${projectId} --zone=${zone} --size=10GB --quiet`,
    );
    // Cloud SQL creation can be slow, so we run them in parallel.
    await Promise.all([
      execAsync(
        `gcloud sql instances create ${csqlName} --project=${projectId} --region=${location} --database-version=POSTGRES_15 --tier=db-f1-micro --root-password=password123 --quiet`,
      ),
      execAsync(
        `gcloud sql instances create ${restoreCsqlName} --project=${projectId} --region=${location} --database-version=POSTGRES_15 --tier=db-f1-micro --root-password=password123 --quiet`,
      ),
    ]);

    // 2. Cleanup any potential leftovers (though unlikely with timestamped names)
    const cleanupIds = [assocId, `disk-${assocId}`, `csql-${assocId}`];
    const cleanupPlans = [planName, `disk-${planName}`, `csql-${planName}`];

    for (const id of cleanupIds) {
      try {
        await deleteBackupPlanAssociation({
          project_id: projectId,
          location,
          backup_plan_association_id: id,
        });
      } catch (_e) {}
    }
    for (const plan of cleanupPlans) {
      try {
        await deleteBackupPlan({ project_id: projectId, location, backup_plan_name: plan });
      } catch (_e) {}
    }

    // 3. Create Backup Vault and setup IAM
    // Idempotent creation
    try {
      await createBackupVault({
        project_id: projectId,
        location,
        backup_vault_name: vaultName,
        description: 'Workflow Test Vault',
        minimum_retention_days: 1,
      });
    } catch (_e) {
      console.log(
        `Vault ${vaultName} might already exist or creation failed, proceeding to get details.`,
      );
    }

    const vaultDetails = (await expectSuccess(
      getBackupVault({
        project_id: projectId,
        location,
        backup_vault_name: vaultName,
      }),
    )) as any;

    const vaultServiceAccount = vaultDetails.serviceAccount;
    if (!vaultServiceAccount) {
      throw new Error(`Service account not found for vault ${vaultName}`);
    }
    const member = `serviceAccount:${vaultServiceAccount}`;

    console.log(
      `Granting roles/backupdr.restoreUser, roles/backupdr.computeEngineOperator and roles/cloudsql.admin to ${member} on project ${projectId}`,
    );
    execSync(
      `gcloud projects add-iam-policy-binding ${projectId} --member="${member}" --role="roles/backupdr.restoreUser" --quiet`,
    );
    execSync(
      `gcloud projects add-iam-policy-binding ${projectId} --member="${member}" --role="roles/backupdr.computeEngineOperator" --quiet`,
    );
    execSync(
      `gcloud projects add-iam-policy-binding ${projectId} --member="${member}" --role="roles/cloudsql.admin" --quiet`,
    );
  }, 2400000);

  afterAll(async () => {
    // 1. Cleanup BackupDR resources
    const cleanupIds = [assocId, `disk-${assocId}`, `csql-${assocId}`];
    const cleanupPlans = [planName, `disk-${planName}`, `csql-${planName}`];

    for (const id of cleanupIds) {
      try {
        await deleteBackupPlanAssociation({
          project_id: projectId,
          location,
          backup_plan_association_id: id,
        });
      } catch (_e) {}
    }
    for (const plan of cleanupPlans) {
      try {
        await deleteBackupPlan({ project_id: projectId, location, backup_plan_name: plan });
      } catch (_e) {}
    }

    // 2. Cleanup VMs, Disks and Cloud SQL
    console.log(
      `Deleting VM: ${vmName}, Disk: ${diskName} and CSQL: ${csqlName}, ${restoreCsqlName}`,
    );
    const cleanupTasks = [
      execAsync(
        `gcloud compute instances delete ${vmName} --project=${projectId} --zone=${zone} --quiet`,
      ).catch(() => {}),
      execAsync(
        `gcloud compute instances delete ${restoreInstanceName} --project=${projectId} --zone=${zone} --quiet`,
      ).catch(() => {}),
      execAsync(
        `gcloud compute disks delete ${diskName} --project=${projectId} --zone=${zone} --quiet`,
      ).catch(() => {}),
      execAsync(
        `gcloud compute disks delete ${restoreDiskName} --project=${projectId} --zone=${zone} --quiet`,
      ).catch(() => {}),
      execAsync(`gcloud sql instances delete ${csqlName} --project=${projectId} --quiet`).catch(
        () => {},
      ),
      execAsync(
        `gcloud sql instances delete ${restoreCsqlName} --project=${projectId} --quiet`,
      ).catch(() => {}),
    ];
    await Promise.all(cleanupTasks);
  }, 2400000);

  it.concurrent(
    'should execute the full backup and restore workflow for a VM',
    async () => {
      // 2. Create Backup Plan
      await expectSuccess(
        createBackupPlan({
          project_id: projectId,
          location,
          backup_plan_name: planName,
          backup_vault: fullVaultName,
          resource_type: resourceType,
          backup_rules: [
            {
              rule_id: ruleId,
              retention_days: 1,
              backup_schedule: {
                standard_schedule: {
                  recurrence_type: 'DAILY',
                  time_zone: 'UTC',
                  backup_window: { start_hour_of_day: 0, end_hour_of_day: 6 },
                },
              },
            },
          ],
        }),
      );

      // 3. Create Backup Plan Association
      await expectSuccess(
        createBackupPlanAssociation({
          project_id: projectId,
          location,
          backup_plan_association_id: assocId,
          resource: targetResource,
          backup_plan: fullPlanName,
          resource_type: resourceType,
        }),
      );

      // 4. Trigger Backup
      const triggerResult = (await triggerBackupForAssociation(
        projectId,
        location,
        assocId,
        ruleId,
      )) as any;
      expect(triggerResult.name).toBeDefined(); // Operation name

      // Wait for the trigger backup operation to complete
      await waitForOperation(triggerResult.name);

      // 5. Check Data Sources
      let dataSources: any[] = [];
      let dataSourceId = '';
      for (let i = 0; i < 20; i++) {
        dataSources = (await expectSuccess(
          listDataSources({
            project_id: projectId,
            location,
            backup_vault_name: vaultName,
          }),
        )) as any[];

        const ds = dataSources.find((d) => {
          const resName = d.dataSourceGcpResource?.gcpResourcename;
          const propsName = d.dataSourceGcpResource?.computeInstanceDatasourceProperties?.name;
          return resName === targetResource || propsName === targetResource;
        });

        if (ds) {
          dataSourceId = ds.name.split('/').pop();
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 20000));
      }
      expect(
        dataSourceId,
        `Data source for ${targetResource} was not found after polling`,
      ).not.toBe('');

      // 6. Check Backup
      let backups: any[] = [];
      for (let i = 0; i < 20; i++) {
        backups = (await expectSuccess(
          listBackups({
            project_id: projectId,
            location,
            backup_vault_name: vaultName,
            datasource_name: dataSourceId,
          }),
        )) as any[];
        if (backups.length > 0) break;
        await new Promise((resolve) => setTimeout(resolve, 30000));
      }
      expect(backups.length).toBeGreaterThan(0);
      const backup = backups[0];

      // 7. Restore Backup
      console.log(`Restoring VM backup to: ${restoreInstanceName}`);
      const restoreResult = (await expectSuccess(
        restoreBackup({
          name: backup.name,
          computeInstanceTargetEnvironment: {
            project: projectId,
            zone,
          },
          computeInstanceRestoreProperties: {
            name: restoreInstanceName,
          },
        }),
      )) as any;
      expect(restoreResult.name).toBeDefined();
    },
    1200000,
  );

  it.concurrent(
    'should execute the full backup and restore workflow for a Disk',
    async () => {
      const diskPlanName = `disk-${planName}`;
      const fullDiskPlanName = `projects/${projectId}/locations/${location}/backupPlans/${diskPlanName}`;
      const diskAssocId = `disk-${assocId}`;

      // 1. Create Backup Plan
      await expectSuccess(
        createBackupPlan({
          project_id: projectId,
          location,
          backup_plan_name: diskPlanName,
          backup_vault: fullVaultName,
          resource_type: diskResourceType,
          backup_rules: [
            {
              rule_id: ruleId,
              retention_days: 1,
              backup_schedule: {
                standard_schedule: {
                  recurrence_type: 'DAILY',
                  time_zone: 'UTC',
                  backup_window: { start_hour_of_day: 0, end_hour_of_day: 6 },
                },
              },
            },
          ],
        }),
      );

      // 2. Create Backup Plan Association
      await expectSuccess(
        createBackupPlanAssociation({
          project_id: projectId,
          location,
          backup_plan_association_id: diskAssocId,
          resource: targetDiskResource,
          backup_plan: fullDiskPlanName,
          resource_type: diskResourceType,
        }),
      );

      // 3. Trigger Backup
      const triggerResult = (await triggerBackupForAssociation(
        projectId,
        location,
        diskAssocId,
        ruleId,
      )) as any;
      expect(triggerResult.name).toBeDefined();

      // Wait for the trigger backup operation to complete
      await waitForOperation(triggerResult.name);

      // 4. Check Data Sources
      let dataSources: any[] = [];
      let dataSourceId = '';
      for (let i = 0; i < 20; i++) {
        dataSources = (await expectSuccess(
          listDataSources({
            project_id: projectId,
            location,
            backup_vault_name: vaultName,
          }),
        )) as any[];

        const ds = dataSources.find((d) => {
          const resName = d.dataSourceGcpResource?.gcpResourcename;
          const propsName = d.dataSourceGcpResource?.diskDatasourceProperties?.name;
          return resName === targetDiskResource || propsName === targetDiskResource;
        });

        if (ds) {
          dataSourceId = ds.name.split('/').pop();
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 20000));
      }
      expect(
        dataSourceId,
        `Data source for ${targetDiskResource} was not found after polling`,
      ).not.toBe('');

      // 5. Check Backup
      let backups: any[] = [];
      for (let i = 0; i < 20; i++) {
        backups = (await expectSuccess(
          listBackups({
            project_id: projectId,
            location,
            backup_vault_name: vaultName,
            datasource_name: dataSourceId,
          }),
        )) as any[];
        if (backups.length > 0) break;
        await new Promise((resolve) => setTimeout(resolve, 30000));
      }
      expect(backups.length).toBeGreaterThan(0);
      const backup = backups[0];

      // 6. Restore Backup
      console.log(`Restoring Disk backup to: ${restoreDiskName}`);
      const restoreResult = (await expectSuccess(
        restoreBackup({
          name: backup.name,
          diskTargetEnvironment: {
            project: projectId,
            zone,
          },
          diskRestoreProperties: {
            name: restoreDiskName,
          },
        }),
      )) as any;
      expect(restoreResult.name).toBeDefined();
    },
    1200000,
  );

  it.concurrent(
    'should execute the full backup and restore workflow for a Cloud SQL instance',
    async () => {
      const csqlPlanName = `csql-${planName}`;
      const fullCsqlPlanName = `projects/${projectId}/locations/${location}/backupPlans/${csqlPlanName}`;
      const csqlAssocId = `csql-${assocId}`;

      // 1. Create Backup Plan
      await expectSuccess(
        createBackupPlan({
          project_id: projectId,
          location,
          backup_plan_name: csqlPlanName,
          backup_vault: fullVaultName,
          resource_type: csqlResourceType,
          backup_rules: [
            {
              rule_id: ruleId,
              retention_days: 1,
              backup_schedule: {
                standard_schedule: {
                  recurrence_type: 'DAILY',
                  time_zone: 'UTC',
                  backup_window: { start_hour_of_day: 0, end_hour_of_day: 6 },
                },
              },
            },
          ],
        }),
      );

      // 2. Create Backup Plan Association
      await expectSuccess(
        createBackupPlanAssociation({
          project_id: projectId,
          location,
          backup_plan_association_id: csqlAssocId,
          resource: targetCsqlResource,
          backup_plan: fullCsqlPlanName,
          resource_type: csqlResourceType,
        }),
      );

      // 3. Trigger Backup
      const triggerResult = (await triggerBackupForAssociation(
        projectId,
        location,
        csqlAssocId,
        ruleId,
      )) as any;
      expect(triggerResult.name).toBeDefined();

      // Wait for the trigger backup operation to complete
      await waitForOperation(triggerResult.name);

      // 4. Check Data Sources
      let dataSources: any[] = [];
      let dataSourceId = '';
      for (let i = 0; i < 20; i++) {
        dataSources = (await expectSuccess(
          listDataSources({
            project_id: projectId,
            location,
            backup_vault_name: vaultName,
          }),
        )) as any[];

        const ds = dataSources.find((d) => {
          const resName = d.dataSourceGcpResource?.gcpResourcename;
          const propsName = d.dataSourceGcpResource?.cloudSqlInstanceDatasourceProperties?.name;
          // Cloud SQL might have different property name or just use gcpResourcename
          return resName === targetCsqlResource || propsName === targetCsqlResource;
        });

        if (ds) {
          dataSourceId = ds.name.split('/').pop();
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 20000));
      }
      expect(
        dataSourceId,
        `Data source for ${targetCsqlResource} was not found after polling`,
      ).not.toBe('');

      // 5. Check Backup
      let backups: any[] = [];
      for (let i = 0; i < 20; i++) {
        backups = (await expectSuccess(
          listBackups({
            project_id: projectId,
            location,
            backup_vault_name: vaultName,
            datasource_name: dataSourceId,
          }),
        )) as any[];
        if (backups.length > 0) break;
        await new Promise((resolve) => setTimeout(resolve, 30000));
      }
      expect(backups.length).toBeGreaterThan(0);
      const backup = backups[0];

      // 6. Restore Backup
      console.log(`Restoring CSQL backup to: ${restoreCsqlName}`);
      const restoreResult = (await expectSuccess(
        csqlRestore({
          project: projectId,
          restore_instance_name: restoreCsqlName,
          backupdr_backup_name: backup.name,
        }),
      )) as any;
      expect(restoreResult.name).toBeDefined();

      // Wait for Cloud SQL restore operation to complete
      await waitForCsqlOperation(projectId, restoreResult.name);
    },
    2400000,
  );
});
