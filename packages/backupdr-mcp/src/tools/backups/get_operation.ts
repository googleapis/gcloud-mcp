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
  name: z
    .string()
    .describe(
      'Required. The name of the operation resource, in the format projects/{project}/locations/{location}/operations/{operation}',
    ),
};

type GetOperationParams = z.infer<z.ZodObject<typeof inputSchema>>;

export async function getOperation(params: GetOperationParams): Promise<CallToolResult> {
  const toolLogger = log.mcp('getOperation', params);
  try {
    const client = apiClientFactory.getBackupDRClient();
    const req: protos.google.longrunning.GetOperationRequest =
      protos.google.longrunning.GetOperationRequest.create({
        name: params.name,
      } as protos.google.longrunning.IGetOperationRequest);
    const [operation] = await client.getOperation(req);

    // const result = operation;

    // // Convert response.value from Buffer to string if it exists
    // const response = result['response'] as Record<string, unknown> | undefined;
    // if (response && response['value'] && Buffer.isBuffer(response['value'])) {
    //   response['value'] = response['value'].toString();
    // }

    // if ('metadata' in result) {
    operation.metadata = {};
    // delete result['metadata'];
    // }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            operation,
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
    toolLogger.error('Failed to get BackupDR operation:', error);
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

export function registerGetOperationTool(server: McpServer) {
  server.registerTool(
    'get_backupdr_operation',
    {
      description: 'Gets the status of a BackupDR operation.',
      inputSchema,
    },
    getOperation,
  );
}
