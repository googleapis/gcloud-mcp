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
import { googleCloudHttpClient, type CsqlOperation } from '../../utility/gcp_http_client.js';
import { log } from '../../utility/logger.js';

const inputSchema = {
  project: z.string().describe('Required. The project ID of the Cloud SQL instance.'),
  restore_instance_name: z
    .string()
    .describe('Required. The name of the Cloud SQL instance to restore to.'),
  backupdr_backup_name: z
    .string()
    .describe('Required. The resource name of the BackupDR backup to restore.'),
};

type CsqlRestoreParams = z.infer<z.ZodObject<typeof inputSchema>>;

export async function csqlRestore(params: CsqlRestoreParams): Promise<CallToolResult> {
  const toolLogger = log.mcp('csqlRestore', params);
  try {
    const operation = (await googleCloudHttpClient.csqlRestore(
      params.project,
      params.restore_instance_name,
      params.backupdr_backup_name,
    )) as CsqlOperation & { metadata?: unknown };

    if (operation && 'metadata' in operation) {
      delete operation.metadata;
    }

    toolLogger.info(`Cloud SQL restore operation started successfully: ${operation.name}`);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(operation, null, 2),
        },
      ],
    };
  } catch (e: unknown) {
    const error = e as Error;
    toolLogger.error('Failed to restore Cloud SQL backup:', error);
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

export function registerCsqlRestoreTool(server: McpServer) {
  server.registerTool(
    'csql_restore',
    {
      description: 'Restores a Cloud SQL backup to a Cloud SQL instance.',
      inputSchema,
    },
    csqlRestore,
  );
}
