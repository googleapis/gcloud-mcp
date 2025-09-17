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
import { z } from 'zod';
import { apiClientFactory } from '../utility/index.js';
import { logger } from '../utility/logger.js';
import { formatFileMetadataResponse } from '../utility/gcs_helpers.js';

export const registerReadObjectMetadataTool = (server: McpServer) => {
  server.registerTool(
    'read_object_metadata',
    {
      description: 'Reads metadata for a specific object.',
      inputSchema: {
        bucket_name: z.string().describe('The name of the GCS bucket.'),
        object_name: z.string().describe('The name of the object.'),
      },
    },
    async (params: { bucket_name: string; object_name: string }) => {
      try {
        logger.info(
          `Reading metadata for object: ${params.object_name} in bucket: ${params.bucket_name}`,
        );
        const storage = apiClientFactory.getStorageClient();
        const [file] = await storage.bucket(params.bucket_name).file(params.object_name).get();

        if (!file) {
          const errorMsg = `Object ${params.object_name} not found in bucket ${params.bucket_name}`;
          logger.warn(errorMsg);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: errorMsg, error_type: 'NotFound' }),
              },
            ],
          };
        }

        logger.info(`Successfully retrieved metadata for object ${params.object_name}`);
        return {
          content: [
            { type: 'text', text: JSON.stringify(formatFileMetadataResponse(file.metadata), null, 2) },
          ],
        };
      } catch (e: unknown) {
        const error = e as Error;
        let errorType = 'Unknown';
        if (error.message.includes('Not Found')) {
          errorType = 'NotFound';
        } else if (error.message.includes('Forbidden')) {
          errorType = 'Forbidden';
        }
        const errorMsg = `Error reading object metadata: ${error.message}`;
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
