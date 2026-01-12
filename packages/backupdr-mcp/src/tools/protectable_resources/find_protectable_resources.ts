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
};

type findProtectableResourcesParams = z.infer<z.ZodObject<typeof inputSchema>>;

export async function findProtectableResources(
  params: findProtectableResourcesParams,
): Promise<CallToolResult> {
  const toolLogger = log.mcp('findProtectableResources', params);
  try {
    // Validate inputs
    z.object(inputSchema).parse(params);

    const csqlClient = apiClientFactory.getCloudSQLClient();
    const computeClient = apiClientFactory.getComputeClient();
    const disksClient = apiClientFactory.getDisksClient();

    const [csqlInstances] = await csqlClient.list({
      project: params.project_id,
    });

    toolLogger.info(`Listed Cloud SQL instances.`);

    const vms = [];
    for await (const [_zone, instancesObject] of computeClient.aggregatedListAsync({
      project: params.project_id,
    })) {
      const instances = instancesObject.instances;
      if (instances && instances.length > 0) {
        vms.push(...instances);
      }
    }
    toolLogger.info(`Listed Compute VMs.`);

    const disks = [];
    for await (const [_zone, disksObject] of disksClient.aggregatedListAsync({
      project: params.project_id,
    })) {
      const diskList = disksObject.disks;
      if (diskList && diskList.length > 0) {
        disks.push(...diskList);
      }
    }
    toolLogger.info(`Listed Compute Disks.`);

    const protectableResources = {
      csqlInstances,
      vms,
      disks,
    };

    return {
      content: [{ type: 'text', text: JSON.stringify(protectableResources, null, 2) }],
    };
  } catch (e: unknown) {
    const error = e as Error;
    toolLogger.error('Error listing protectable resources', error);
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

export const registerFindProtectableResourcesTool = (server: McpServer) => {
  server.registerTool(
    'find_protectable_resources',
    {
      description:
        'Lists protectable resources in a project. This includes Cloud SQL instances, Compute VMs, and Compute Disks.',
      inputSchema,
    },
    findProtectableResources,
  );
};
