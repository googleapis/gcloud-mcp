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
  location: z.string().describe('The location of the backup vaults.'),
  page_size: z.number().optional().describe('The maximum number of results to return.'),
  page_token: z
    .string()
    .optional()
    .describe('A page token, received from a previous `listBackupVaults` call.'),
  filter: z.string().optional().describe('An expression for filtering the results of the request.'),
  order_by: z
    .string()
    .optional()
    .describe('An expression for ordering the results of the request.'),
};

type ListBackupVaultsParams = z.infer<z.ZodObject<typeof inputSchema>>;

export async function listBackupVaults(params: ListBackupVaultsParams): Promise<CallToolResult> {
  const toolLogger = log.mcp('listBackupVaults', params);
  try {
    const client = apiClientFactory.getBackupDRClient();
    const parent = `projects/${params.project_id}/locations/${params.location}`;
    const request: protos.google.cloud.backupdr.v1.IListBackupVaultsRequest = {};
    request.parent = parent;
    if (params.filter) {
      request.filter = params.filter;
    }
    if (params.order_by) {
      request.orderBy = params.order_by;
    }
    if (params.page_token) {
      request.pageToken = params.page_token;
    }
    if (params.page_size) {
      request.pageSize = params.page_size;
    }
    const [vaults] = await client.listBackupVaults(request);

    toolLogger.info(`Found ${vaults.length} backup vaults.`);

    return {
      content: [{ type: 'text', text: JSON.stringify(vaults, null, 2) }],
    };
  } catch (e: unknown) {
    const error = e as Error;
    toolLogger.error('Error listing backup vaults', error);
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

export const registerListBackupVaultsTool = (server: McpServer) => {
  server.registerTool(
    'list_backup_vaults',
    {
      description: 'Lists all backup vaults in a given project and location.',
      inputSchema,
    },
    listBackupVaults,
  );
};
