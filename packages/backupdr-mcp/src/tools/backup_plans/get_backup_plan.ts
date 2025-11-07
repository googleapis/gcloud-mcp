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
  location: z.string().describe('The location of the backup plan.'),
  backup_plan_name: z.string().describe('The name of the backup plan.'),
};

type GetBackupPlanParams = z.infer<z.ZodObject<typeof inputSchema>>;

export async function getBackupPlan(params: GetBackupPlanParams): Promise<CallToolResult> {
  const toolLogger = log.mcp('getBackupPlan', params);
  try {
    const client = apiClientFactory.getBackupDRClient();
    const name = `projects/${params.project_id}/locations/${params.location}/backupPlans/${params.backup_plan_name}`;
    const request: protos.google.cloud.backupdr.v1.IGetBackupPlanRequest = {
      name,
    };
    const [plan] = await client.getBackupPlan(request);

    toolLogger.info(`Found backup plan.`);

    return {
      content: [{ type: 'text', text: JSON.stringify(plan, null, 2) }],
    };
  } catch (e: unknown) {
    const error = e as Error;
    toolLogger.error('Error getting backup plan', error);
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

export const registerGetBackupPlanTool = (server: McpServer) => {
  server.registerTool(
    'get_backup_plan',
    {
      description: 'Gets a backup plan.',
      inputSchema,
    },
    getBackupPlan,
  );
};
