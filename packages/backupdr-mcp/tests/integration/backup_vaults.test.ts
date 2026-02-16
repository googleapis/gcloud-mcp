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
import { getBackupVault } from '../../src/tools/backup_vaults/get_backup_vault.js';
import { listBackupVaults } from '../../src/tools/backup_vaults/list_backup_vaults.js';

const projectId = process.env['GOOGLE_CLOUD_PROJECT'] || process.env['GCP_PROJECT_ID'];
const location = 'us-central1';

if (!projectId) {
  throw new Error('GOOGLE_CLOUD_PROJECT or GCP_PROJECT_ID environment variable not set');
}

const vaultName = `test-vault-${Date.now()}`;
const fullVaultName = `projects/${projectId}/locations/${location}/backupVaults/${vaultName}`;

describe('Backup Vaults Integration Tests', () => {
  beforeAll(async () => {
    // Ensure cleanup if a previous test failed
    try {
      await deleteBackupVault({
        project_id: projectId,
        location,
        backup_vault_name: vaultName,
      });
    } catch (_e) {
      // Ignore error if vault doesn't exist
    }
  }, 300000);

  afterAll(async () => {
    try {
      await deleteBackupVault({
        project_id: projectId,
        location,
        backup_vault_name: vaultName,
      });
    } catch (_e) {
      // Ignore error if vault was already deleted
    }
  }, 300000);

  it('should create a backup vault', async () => {
    const result = (await expectSuccess(
      createBackupVault({
        project_id: projectId,
        location,
        backup_vault_name: vaultName,
        description: 'Test Backup Vault',
        minimum_retention_days: 1,
      }),
    )) as any;

    expect(result.name).toBe(fullVaultName);
  }, 300000);

  it('should get a backup vault', async () => {
    const result = (await expectSuccess(
      getBackupVault({
        project_id: projectId,
        location,
        backup_vault_name: vaultName,
      }),
    )) as any;

    expect(result.name).toBe(fullVaultName);
    expect(result.description).toBe('Test Backup Vault');
  }, 300000);

  it('should list backup vaults', async () => {
    const vaults = (await expectSuccess(
      listBackupVaults({
        project_id: projectId,
        location,
      }),
    )) as any[];

    const vaultNames = vaults.map((v) => v.name);
    expect(vaultNames).toContain(fullVaultName);
  }, 300000);

  it('should delete a backup vault', async () => {
    const result = await expectSuccess(
      deleteBackupVault({
        project_id: projectId,
        location,
        backup_vault_name: vaultName,
      }),
    );

    expect(result).toBe(`Backup vault ${vaultName} deleted.`);

    // Verify deletion
    const getResult = await getBackupVault({
      project_id: projectId,
      location,
      backup_vault_name: vaultName,
    });

    expect(JSON.stringify(getResult.content)).toContain('not found');
  }, 300000);
});
