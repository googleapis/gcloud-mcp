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

import { GetFilesOptions, File } from '@google-cloud/storage';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiClientFactory } from '../../utility/index.js';
import { logger } from '../../utility/logger.js';

export const registerListObjectsTool = (server: McpServer) => {
  server.registerTool(
    'list_objects',
    {
      description: 'Lists objects in a GCS bucket with optional filters.',
      inputSchema: {
        bucket_name: z.string().describe('The name of the GCS bucket.'),
        prefix: z
          .string()
          .optional()
          .describe('Filters results to objects whose names begin with this prefix.'),
        delimiter: z
          .string()
          .optional()
          .describe(
            'Results will contain only objects whose names, aside from the prefix, do not contain this delimiter.',
          ),
      },
    },
    async (params: {
      bucket_name: string;
      prefix?: string | undefined;
      delimiter?: string | undefined;
    }) => {
      try {
        logger.info(
          `Listing objects in bucket: ${params.bucket_name}, prefix: ${params.prefix}, delimiter: ${params.delimiter}`,
        );
        const storage = apiClientFactory.getStorageClient();
        const options: GetFilesOptions = {};
        if (params.prefix) {
          options.prefix = params.prefix;
        }
        if (params.delimiter) {
          options.delimiter = params.delimiter;
        }
        const [files] = await storage.bucket(params.bucket_name).getFiles(options);

        const objectList = files.map((file: File) => file.name);

        const result = {
          bucket: params.bucket_name,
          prefix: params.prefix,
          delimiter: params.delimiter,
          object_count: objectList.length,
          objects: objectList,
        };

        logger.info(
          `Successfully listed ${objectList.length} objects from bucket ${params.bucket_name}`,
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (e: unknown) {
        const error = e as Error;
        let errorType = 'Unknown';
        if (error.message.includes('Not Found')) {
          errorType = 'NotFound';
        } else if (error.message.includes('Forbidden')) {
          errorType = 'Forbidden';
        }
        const errorMsg = `Error listing objects: ${error.message}`;
        logger.error(errorMsg);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: errorMsg, error_type: errorType }),
            },
          ],
        };
      }
    },
  );
};
