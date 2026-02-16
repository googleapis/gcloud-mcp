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
  backup_plan_association_id: z.string().describe('The ID of the backup plan association.'),
  backup_rule_id: z.string().describe('The ID of the backup rule to trigger.'),
};

type TriggerBackupParams = z.infer<z.ZodObject<typeof inputSchema>>;

export async function triggerBackup(params: TriggerBackupParams): Promise<CallToolResult> {
  const toolLogger = log.mcp('triggerBackup', params);
  try {
    const client = apiClientFactory.getBackupDRClient();
    const name = `projects/${params.project_id}/locations/${params.location}/backupPlanAssociations/${params.backup_plan_association_id}`;

    const request: protos.google.cloud.backupdr.v1.ITriggerBackupRequest = {
      name,
      ruleId: params.backup_rule_id,
    };

    const [operation] = await client.triggerBackup(request);

    toolLogger.info(`Triggered backup for association ${params.backup_plan_association_id}.`);

    const result = { ...operation.latestResponse };
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  } catch (e: unknown) {
    const error = e as Error;
    toolLogger.error('Error triggering backup', error);
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

export const registerTriggerBackupTool = (server: McpServer) => {
  server.registerTool(
    'trigger_backup',
    {
      description: 'Triggers a backup for a given backup plan association.',
      inputSchema,
    },
    triggerBackup,
  );
};
