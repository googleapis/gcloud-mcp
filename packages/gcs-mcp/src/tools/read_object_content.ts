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
import {
  MAX_CONTENT_SIZE,
  STREAMING_THRESHOLD,
} from '../utility/gcs_helpers.js';

export const registerReadObjectContentTool = (server: McpServer) => {
  server.registerTool(
    'read_object_content',
    {
      description: 'Reads the content of a specific object.',
      inputSchema: {
        bucket_name: z.string().describe('The name of the GCS bucket.'),
        object_name: z.string().describe('The name of the object.'),
      },
    },
    async (params: { bucket_name: string; object_name: string }) => {
      try {
        logger.info(
          `Reading content for object: ${params.object_name} in bucket: ${params.bucket_name}`
        );
        const storage = apiClientFactory.getStorageClient();

        const file = storage
          .bucket(params.bucket_name)
          .file(params.object_name);
        const [metadata] = await file.get();
        const size = Number(metadata.metadata.size);
        const contentType =
          metadata.metadata.contentType || 'application/octet-stream';

        // Handle size constraints before downloading
        if (size > MAX_CONTENT_SIZE) {
          const errorMsg = `Object ${params.object_name} is too large (${size} bytes) to read into memory. Maximum size is ${MAX_CONTENT_SIZE} bytes.`;
          logger.error(errorMsg);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  error: errorMsg,
                  error_type: 'ContentTooLarge',
                }),
              },
            ],
          };
        }

        if (size > STREAMING_THRESHOLD) {
          logger.warn(
            `Object ${params.object_name} is large (${size} bytes). Consider using streaming for better performance.`
          );
        }

        const [buffer] = await file.download();

        // Check if it's a text document
        if (contentType.startsWith('text/')) {
          try {
            // Try to decode as text.
            const content = buffer.toString('utf8');
            const result = {
              bucket: params.bucket_name,
              object: params.object_name,
              size,
              content_type: contentType,
              content,
            };
            logger.info(
              `Successfully read text content for object ${params.object_name} (${size} bytes)`
            );
            return {
              content: [
                { type: 'text', text: JSON.stringify(result, null, 2) },
              ],
            };
          } catch (e) {
            // If decoding fails, fall through to treat as a raw resource.
            logger.warn(
              `Failed to decode ${params.object_name} as text, treating as raw resource.`
            );
          }
        }

        // Treat everything else (non-text or text that failed to decode) as a raw resource
        const contentBase64 = buffer.toString('base64');
        logger.info(
          `Successfully read raw content for object ${params.object_name} (${size} bytes)`
        );
        return {
          content: [
            {
              message: `Successfully read raw content for object ${params.object_name} (${size} bytes)`,
              type: 'resource',
              resource: {
                uri: `gcs://${params.bucket_name}/${params.object_name}`,
                mimeType: contentType,
                blob: contentBase64,
              },
            },
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
        const errorMsg = `Error reading object content: ${error.message}`;
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
    }
  );
};
