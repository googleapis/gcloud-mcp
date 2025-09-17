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
import { apiClientFactory } from '../../utility/index.js';
import { logger } from '../../utility/logger.js';

export const registerUpdateObjectMetadataTool = (server: McpServer) => {
  server.registerTool(
    'update_object_metadata',
    {
      description: 'Updates the metadata of an existing object.',
      inputSchema: {
        bucket_name: z.string().describe('The name of the GCS bucket.'),
        object_name: z.string().describe('The name of the object to update.'),
        metadata: z.record(z.string()).describe('A dictionary of metadata to set on the object.'),
      },
    },
    async (params: {
      bucket_name: string;
      object_name: string;
      metadata: Record<string, string>;
    }) => {
      try {
        logger.info(
          `Updating metadata for object: ${params.object_name} in bucket: ${params.bucket_name}`,
        );

        const string_metadata: Record<string, string> = {};
        for (const [key, value] of Object.entries(params.metadata)) {
          string_metadata[String(key)] = String(value);
        }

        const storage = apiClientFactory.getStorageClient();
        await storage
          .bucket(params.bucket_name)
          .file(params.object_name)
          .setMetadata({ metadata: string_metadata });

        const result = {
          success: true,
          message: `Metadata for object ${params.object_name} updated successfully`,
          bucket: params.bucket_name,
          object: params.object_name,
          updated_metadata: string_metadata,
        };
        logger.info(`Successfully updated metadata for object ${params.object_name}`);
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
        } else if (error.message.includes('Invalid')) {
          errorType = 'BadRequest';
        }
        const errorMsg = `Error updating object metadata: ${error.message}`;
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
