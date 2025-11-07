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
  location: z.string().describe('The location of the backup plan association.'),
  backup_plan_association_id: z
    .string()
    .describe('The ID of the backup plan association to create.'),
  resource: z
    .string()
    .describe('The full resource name of the resource to associate with the backup plan.'),
  backup_plan: z.string().describe('The full resource name of the backup plan.'),
  resource_type: z.string().describe('The type of the resource.'),
};

type CreateBackupPlanAssociationParams = z.infer<z.ZodObject<typeof inputSchema>>;

export async function createBackupPlanAssociation(
  params: CreateBackupPlanAssociationParams,
): Promise<CallToolResult> {
  const toolLogger = log.mcp('createBackupPlanAssociation', params);
  try {
    const client = apiClientFactory.getBackupDRClient();
    const parent = `projects/${params.project_id}/locations/${params.location}`;
    const backupPlanAssociation: protos.google.cloud.backupdr.v1.IBackupPlanAssociation = {
      resource: params.resource,
      backupPlan: params.backup_plan,
      resourceType: params.resource_type,
    };

    const request: protos.google.cloud.backupdr.v1.ICreateBackupPlanAssociationRequest = {
      parent,
      backupPlanAssociationId: params.backup_plan_association_id,
      backupPlanAssociation,
    };

    const [operation] = await client.createBackupPlanAssociation(request);
    const [response] = await operation.promise();

    toolLogger.info(`Created backup plan association.`);

    return {
      content: [{ type: 'text', text: JSON.stringify(response, null, 2) }],
    };
  } catch (e: unknown) {
    const error = e as Error;
    toolLogger.error('Error creating backup plan association', error);
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

export const registerCreateBackupPlanAssociationTool = (server: McpServer) => {
  server.registerTool(
    'create_backup_plan_association',
    {
      description: 'Creates a new backup plan association.',
      inputSchema,
    },
    createBackupPlanAssociation,
  );
};
