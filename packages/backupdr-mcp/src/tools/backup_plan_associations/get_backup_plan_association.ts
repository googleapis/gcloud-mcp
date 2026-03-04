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

const inputSchema = {
  project_id: z.string().describe('The ID of the GCP project.'),
  location: z.string().describe('The location of the backup plan association.'),
  backup_plan_association_id: z.string().describe('The ID of the backup plan association to get.'),
};

type GetBackupPlanAssociationParams = z.infer<z.ZodObject<typeof inputSchema>>;

export async function getBackupPlanAssociation(
  params: GetBackupPlanAssociationParams,
): Promise<CallToolResult> {
  const toolLogger = log.mcp('getBackupPlanAssociation', params);
  try {
    const client = apiClientFactory.getBackupDRClient();
    const name = `projects/${params.project_id}/locations/${params.location}/backupPlanAssociations/${params.backup_plan_association_id}`;

    const [response] = await client.getBackupPlanAssociation({ name });

    toolLogger.info(`Got backup plan association.`);

    return {
      content: [{ type: 'text', text: JSON.stringify(response, null, 2) }],
    };
  } catch (e: unknown) {
    const error = e as Error;
    toolLogger.error('Error getting backup plan association', error);
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

export const registerGetBackupPlanAssociationTool = (server: McpServer) => {
  server.registerTool(
    'get_backup_plan_association',
    {
      description: 'Gets a backup plan association.',
      inputSchema,
    },
    getBackupPlanAssociation,
  );
};
