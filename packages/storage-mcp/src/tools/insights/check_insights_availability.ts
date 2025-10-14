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

const serviceName = 'storageinsights.googleapis.com';

const inputSchema = {
  projectId: z
    .string()
    .optional()
    .describe(
      'The project ID to check Storage Insights availability and list insights configs for',
    ),
};

type CheckInsightsAvailabilityParams = z.infer<z.ZodObject<typeof inputSchema>>;

export async function checkInsightsAvailability(
  params: CheckInsightsAvailabilityParams,
): Promise<CallToolResult> {
  const serviceUsageClient = apiClientFactory.getServiceUsageClient();
  const projectId = params.projectId || process.env['GOOGLE_CLOUD_PROJECT'];
  if (!projectId) {
    throw new Error(
      'Project ID not specified. Please specify via the projectId parameter or GOOGLE_CLOUD_PROJECT environment variable.',
    );
  }

  const [services] = await serviceUsageClient.listServices({
    parent: `projects/${projectId}`,
    filter: 'state:ENABLED',
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isEnabled = services.some((service: any) => service.config?.name === serviceName);

  if (!isEnabled) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            insightsEnabled: false,
          }),
        },
      ],
    };
  }

  const storageInsightsClient = apiClientFactory.getStorageInsightsClient();

  try {
    const parent = `projects/${projectId}/locations/-`;
    const iterable = storageInsightsClient.listDatasetConfigsAsync({ parent });
    const configs = [];
    for await (const config of iterable) {
      configs.push(config);
    }
    logger.info(`Successfully listed ${configs.length} dataset configs.`);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            insightsEnabled: true,
            configurations: configs,
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
            insightsEnabled: true,
            error: 'Failed to list dataset configs',
            details: err?.message,
          }),
        },
      ],
    };
  }
}

export const registerCheckInsightsAvailabilityTool = (server: McpServer) => {
  server.registerTool(
    'check_insights_availability',
    {
      description:
        'Checks if GCS insights service is enabled. If it is enabled,\
         returns the list of all the dataset configurations across regions.\
         The user have to then select one of the configurations from the returned dataset.\
         The configuration will contain a linked dataset which will be a BigQuery dataset\
         containing metadata about buckets and objects in Cloud Storage. This metadata can\
         be used to answer analytical queries about GCS buckets and objects.',
      inputSchema,
    },
    checkInsightsAvailability,
  );
};
