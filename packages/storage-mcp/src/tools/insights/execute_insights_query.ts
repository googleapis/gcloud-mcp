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

const inputSchema = {
  config: z.string().describe('The JSON object of the insights dataset configuration.'),
  query: z.string().describe('The BigQuery SQL query to execute.'),
  jobTimeoutMs: z
    .number()
    .optional()
    .default(20000)
    .describe('The maximum amount of time for the job to run on the server.'),
};

type ExecuteInsightsQueryParams = z.infer<z.ZodObject<typeof inputSchema>>;

export async function executeInsightsQuery(
  params: ExecuteInsightsQueryParams,
): Promise<CallToolResult> {
  const bigqueryClient = apiClientFactory.getBigQueryClient();

  try {
    const config = JSON.parse(params.config);
    const linkedDataset = config.link?.dataset;
    if (!linkedDataset) {
      throw new Error('Configuration does not have a linked dataset.');
    }
    const parts = linkedDataset.split('/');
    const projectId = parts[1];
    const datasetId = parts[parts.length - 1];

    const [job] = await bigqueryClient.dataset(datasetId, { projectId }).createQueryJob({
      query: params.query,
      jobTimeoutMs: params.jobTimeoutMs,
    });
    logger.info(`Job ${job.id} started.`);

    const [rows] = await job.getQueryResults();

    logger.info(`Successfully executed query.`);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(rows),
        },
      ],
    };
  } catch (error) {
    const err = error as Error;
    logger.error('Error executing insights query:', err);
    let errorType = 'Unknown';
    if (err.message.includes('Job timed out')) {
      errorType = 'Timeout';
    }
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: 'Failed to execute insights query',
            error_type: errorType,
            details: err?.message,
          }),
        },
      ],
    };
  }
}

export const registerExecuteInsightsQueryTool = (server: McpServer) => {
  server.registerTool(
    'execute_insights_query',
    {
      description:
        'Executes a BigQuery SQL query against an insights dataset and returns the result.',
      inputSchema,
    },
    executeInsightsQuery,
  );
};
