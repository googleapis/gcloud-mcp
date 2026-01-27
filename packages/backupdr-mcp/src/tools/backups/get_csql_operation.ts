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
import { googleCloudHttpClient } from '../../utility/gcp_http_client.js';
import { log } from '../../utility/logger.js';

const inputSchema = {
  project: z.string().describe('Required. The project ID of the Cloud SQL instance.'),
  operation_name: z.string().describe('Required. The name (ID) of the operation to check.'),
};

type GetCsqlOperationParams = z.infer<z.ZodObject<typeof inputSchema>>;

export async function getCsqlOperation(params: GetCsqlOperationParams): Promise<CallToolResult> {
  const toolLogger = log.mcp('getCsqlOperation', params);
  try {
    const result = (await googleCloudHttpClient.getCsqlOperation(
      params.project,
      params.operation_name,
    )) as Record<string, unknown>;

    if (result) {
      result['metadata'] = {};
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            result,
            (_, value) => {
              // If we encounter a Buffer (the source of your \n characters)
              if (value && value.type === 'Buffer') {
                const buf = Buffer.from(value.data || value);

                // 1. Try to decode as UTF-8
                const rawStr = buf.toString('utf8');

                // 2. Use a Regex to extract ONLY the printable parts (3+ chars)
                // This strips away binary tags like \n, \u0001, and length prefixes.
                const printableMatches = rawStr.match(/[\x20-\x7E]{3,}/g);

                if (printableMatches) {
                  // If there are multiple strings (like project path + zone), join them
                  return printableMatches.length === 1
                    ? printableMatches[0]
                    : printableMatches.join(' | ');
                }

                // 3. Fallback if no printable text is found
                return rawStr;
              }
              return value;
            },
            2,
          ),
        },
      ],
    };
  } catch (e: unknown) {
    const error = e as Error;
    toolLogger.error('Failed to get Cloud SQL operation:', error);
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

export function registerGetCsqlOperationTool(server: McpServer) {
  server.registerTool(
    'get_csql_operation',
    {
      description: 'Gets the status of a Cloud SQL operation.',
      inputSchema,
    },
    getCsqlOperation,
  );
}
