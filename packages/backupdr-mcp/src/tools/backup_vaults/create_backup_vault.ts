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
import { z } from 'zod';
import { apiClientFactory } from '../../utility/api_client_factory.js';
import { log } from '../../utility/logger.js';
import { protos } from '@google-cloud/backupdr';

const inputSchema = {
  project_id: z.string().describe('The ID of the GCP project.'),
  location: z.string().describe('The location of the backup vault.'),
  backup_vault_name: z.string().describe('The name of the backup vault to create.'),
  description: z.string().optional().describe('The description of the backup vault.'),
  minimum_retention_days: z
    .number()
    .describe('The minimum retention period for a backup in the backup vault in days.'),
};

type CreateBackupVaultParams = z.infer<z.ZodObject<typeof inputSchema>>;

export async function createBackupVault(params: CreateBackupVaultParams): Promise<CallToolResult> {
  const toolLogger = log.mcp('createBackupVault', params);
  try {
    const client = apiClientFactory.getBackupDRClient();
    const parent = `projects/${params.project_id}/locations/${params.location}`;
    const backupVault: protos.google.cloud.backupdr.v1.IBackupVault = {};
    if (params.description) {
      backupVault.description = params.description;
    }
    backupVault.backupMinimumEnforcedRetentionDuration = {
      seconds: params.minimum_retention_days * 86400,
      nanos: 0,
    };

    const request: protos.google.cloud.backupdr.v1.ICreateBackupVaultRequest = {
      parent,
      backupVaultId: params.backup_vault_name,
      backupVault,
    };

    const [operation] = await client.createBackupVault(request);
    const [response] = await operation.promise();

    toolLogger.info(`Created backup vault.`);

    return {
      content: [{ type: 'text', text: JSON.stringify(response, null, 2) }],
    };
  } catch (e: unknown) {
    const error = e as Error;
    toolLogger.error('Error creating backup vault', error);
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

export const registerCreateBackupVaultTool = (server: McpServer) => {
  server.registerTool(
    'create_backup_vault',
    {
      description: 'Creates a new backup vault.',
      inputSchema,
    },
    createBackupVault,
  );
};
