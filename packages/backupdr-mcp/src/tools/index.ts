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

import {
  registerCreateBackupVaultTool,
  registerDeleteBackupVaultTool,
  registerGetBackupVaultTool,
  registerListBackupVaultsTool,
} from './backup_vaults/index.js';
import {
  registerCreateBackupPlanTool,
  registerDeleteBackupPlanTool,
  registerGetBackupPlanTool,
  registerListBackupPlansTool,
  registerUpdateBackupPlanTool,
} from './backup_plans/index.js';
import { registerBackupPlanAssociationsTools } from './backup_plan_associations/index.js';
import { registerDataSourcesTools } from './datasources/index.js';
import { registerBackupsTools } from './backups/index.js';
import { registerListResourceBackupConfigsTool } from './resource_backup_configs/list_resource_backup_config.js';

export const allTools = [
  registerListBackupVaultsTool,
  registerCreateBackupVaultTool,
  registerDeleteBackupVaultTool,
  registerGetBackupVaultTool,
  registerListBackupPlansTool,
  registerCreateBackupPlanTool,
  registerDeleteBackupPlanTool,
  registerGetBackupPlanTool,
  registerUpdateBackupPlanTool,
  registerBackupPlanAssociationsTools,
  registerListResourceBackupConfigsTool,
  registerDataSourcesTools,
  registerBackupsTools,
];
