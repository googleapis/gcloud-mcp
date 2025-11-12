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
import { apiClientFactory } from '../../utility/index.js';
import { logger } from '../../utility/logger.js';
import { protos } from '@google-cloud/service-usage';

type ServiceResource = protos.google.api.serviceusage.v1.IService;

const serviceName = 'storageinsights.googleapis.com';

const inputSchema = {
  projectId: z
    .string()
    .optional()
    .describe('The project ID to list Storage Insights dataset configurations for.'),
};

type ListInsightsConfigsParams = z.infer<z.ZodObject<typeof inputSchema>>;

export async function listInsightsConfigs(
  params: ListInsightsConfigsParams,
): Promise<CallToolResult> {
  const storageInsightsClient = apiClientFactory.getStorageInsightsClient();
  const serviceUsageClient = apiClientFactory.getServiceUsageClient();
  const projectId =
    params.projectId || process.env['GOOGLE_CLOUD_PROJECT'] || process.env['GCP_PROJECT_ID'];
  if (!projectId) {
    throw new Error(
      'Project ID not specified. Please specify via the projectId parameter or GOOGLE_CLOUD_PROJECT or GCP_PROJECT_ID environment variable.',
    );
  }

  const [services] = await serviceUsageClient.listServices({
    parent: `projects/${projectId}`,
    filter: 'state:ENABLED',
  });

  const isEnabled = services.some(
    (service: ServiceResource) => service.config?.name === serviceName,
  );

  if (!isEnabled) {
    throw new Error(
      `Storage Insights API is not enabled for project ${projectId}. Please enable it to proceed.`,
    );
  }

  try {
    const parent = `projects/${projectId}/locations/-`;
    const iterable = storageInsightsClient.listDatasetConfigsAsync({ parent });
    const configNames: string[] = [];
    for await (const config of iterable) {
      if (config.name) {
        configNames.push(config.name);
      }
    }
    logger.info(`Successfully listed ${configNames.length} dataset config names.`);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            configurations: configNames,
          }),
        },
      ],
    };
  } catch (error) {
    const err = error instanceof Error ? error : undefined;
    logger.error('Error listing dataset configs:', err);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: 'Failed to list dataset configurations',
            details: err?.message,
          }),
        },
      ],
    };
  }
}

export const registerListInsightsConfigsTool = (server: McpServer) => {
  server.registerTool(
    'list_insights_configs',
    {
      description:
        'Lists the names of all Storage Insights dataset configurations for a given project.',
      inputSchema,
    },
    listInsightsConfigs,
  );
};
