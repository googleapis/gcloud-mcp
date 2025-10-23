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

const serviceName = 'storageinsights.googleapis.com';

const inputSchema = {
  projectId: z
    .string()
    .optional()
    .describe(
      'The project ID to check Storage Insights availability for.',
    ),
};

type CheckInsightsAvailabilityParams = z.infer<z.ZodObject<typeof inputSchema>>;

export async function checkInsightsAvailability(
  params: CheckInsightsAvailabilityParams,
): Promise<CallToolResult> {
  const serviceUsageClient = apiClientFactory.getServiceUsageClient();
  const projectId = params.projectId || process.env['GOOGLE_CLOUD_PROJECT'] || process.env['GCP_PROJECT_ID'];
  if (!projectId) {
    throw new Error(
      'Project ID not specified. Please specify via the projectId parameter or GOOGLE_CLOUD_PROJECT or GCP_PROJECT_ID environment variable.',
    );
  }

  const [services] = await serviceUsageClient.listServices({
    parent: `projects/${projectId}`,
    filter: 'state:ENABLED',
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isEnabled = services.some((service: any) => service.config?.name === serviceName);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          insightsEnabled: isEnabled,
        }),
      },
    ],
  };
}

export const registerCheckInsightsAvailabilityTool = (server: McpServer) => {
  server.registerTool(
    'check_insights_availability',
    {
      description: 'Checks if GCS insights service is enabled.',
      inputSchema,
    },
    checkInsightsAvailability,
  );
};
