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

  backup_plan_association_id: z

    .string()

    .describe('The ID of the backup plan association to delete.'),
};

type DeleteBackupPlanAssociationParams = z.infer<z.ZodObject<typeof inputSchema>>;

export async function deleteBackupPlanAssociation(
  params: DeleteBackupPlanAssociationParams,
): Promise<CallToolResult> {
  const toolLogger = log.mcp('deleteBackupPlanAssociation', params);

  try {
    const client = apiClientFactory.getBackupDRClient();

    const name = `projects/${params.project_id}/locations/${params.location}/backupPlanAssociations/${params.backup_plan_association_id}`;

    const [operation] = await client.deleteBackupPlanAssociation({ name });

    await operation.promise();

    toolLogger.info(`Deleted backup plan association.`);

    return {
      content: [
        {
          type: 'text',
          text: `Successfully deleted backup plan association ${params.backup_plan_association_id}`,
        },
      ],
    };
  } catch (e: unknown) {
    const error = e as Error;
    toolLogger.error('Error deleting backup plan association', error);
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

export const registerDeleteBackupPlanAssociationTool = (server: McpServer) => {
  server.registerTool(
    'delete_backup_plan_association',
    {
      description: 'Deletes a backup plan association.',
      inputSchema,
    },
    deleteBackupPlanAssociation,
  );
};
