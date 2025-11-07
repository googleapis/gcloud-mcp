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
import {
  backupDrHttpClient,
  type ListResourceBackupConfigsParams,
} from '../../utility/backupdr_http_client.js';
import { log } from '../../utility/logger.js';

const inputSchema = {
  project_id: z.string().describe('The ID of the GCP project.'),
  location: z.string().describe('The location of the resource backup configs.'),
  page_size: z.number().optional().describe('The maximum number of results to return.'),
  page_token: z
    .string()
    .optional()
    .describe('A page token, received from a previous `listResourceBackupConfigs` call.'),
  filter: z.string().optional().describe('An expression for filtering the results of the request.'),
  order_by: z
    .string()
    .optional()
    .describe('An expression for ordering the results of the request.'),
};

type ListResourceBackupConfigsParamsSchema = z.infer<z.ZodObject<typeof inputSchema>>;

export async function listResourceBackupConfigs(
  params: ListResourceBackupConfigsParamsSchema,
): Promise<CallToolResult> {
  const toolLogger = log.mcp('listResourceBackupConfigs', params);
  try {
    const request: ListResourceBackupConfigsParams = {
      projectId: params.project_id,
      location: params.location,
    };
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
    const configs = (await backupDrHttpClient.listResourceBackupConfigs(request)) as {
      length: number;
    };

    toolLogger.info(`Found ${configs.length} resource backup configs.`);

    return {
      content: [{ type: 'text', text: JSON.stringify(configs, null, 2) }],
    };
  } catch (e: unknown) {
    const error = e as Error;
    toolLogger.error('Error listing resource backup configs', error);
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

export function registerListResourceBackupConfigsTool(server: McpServer) {
  server.registerTool(
    'list_resource_backup_configs',
    {
      description: 'Lists all resource backup configs in a given project and location.',
      inputSchema,
    },
    listResourceBackupConfigs,
  );
}
