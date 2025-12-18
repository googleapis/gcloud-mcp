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
  backup_vault_name: z.string().describe('The name of the backup vault.'),
  datasource_name: z.string().describe('The name of the datasource.'),
};

type GetDataSourceParams = z.infer<z.ZodObject<typeof inputSchema>>;

export async function getDataSource(params: GetDataSourceParams): Promise<CallToolResult> {
  const toolLogger = log.mcp('getDataSource', params);
  try {
    const client = apiClientFactory.getBackupDRClient();
    const name = `projects/${params.project_id}/locations/${params.location}/backupVaults/${params.backup_vault_name}/dataSources/${params.datasource_name}`;
    const request: protos.google.cloud.backupdr.v1.IGetDataSourceRequest = {
      name,
    };
    const [dataSource] = await client.getDataSource(request);

    toolLogger.info(`Found data source.`);

    return {
      content: [{ type: 'text', text: JSON.stringify(dataSource, null, 2) }],
    };
  } catch (e: unknown) {
    const error = e as Error;
    toolLogger.error('Error getting data source', error);
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

export const registerGetDataSourceTool = (server: McpServer) => {
  server.registerTool(
    'get_datasource',
    {
      description: 'Gets a data source.',
      inputSchema,
    },
    getDataSource,
  );
};
