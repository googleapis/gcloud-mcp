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

export const registerGenerateUploadSignedUrlTool = (server: McpServer) => {
  server.registerTool(
    'generate_upload_signed_url',
    {
      description: 'Generates a signed URL for uploading an object to GCS.',
      inputSchema: {
        bucket_name: z.string().describe('The name of the GCS bucket.'),
        object_name: z.string().describe('The name of the object to upload.'),
        content_type: z
          .string()
          .optional()
          .default('application/octet-stream')
          .describe('The content type of the object to upload.'),
        expiration_minutes: z
          .number()
          .optional()
          .default(15)
          .describe('URL expiration time in minutes.'),
      },
    },
    async (params: {
      bucket_name: string;
      object_name: string;
      content_type: string;
      expiration_minutes: number;
    }) => {
      try {
        logger.info(
          `Generating upload signed URL for object: ${params.object_name} in bucket: ${params.bucket_name}`,
        );

        if (params.expiration_minutes <= 0 || params.expiration_minutes > 10080) {
          const errorMsg = 'Expiration time must be between 1 minute and 7 days (10080 minutes)';
          logger.error(errorMsg);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  error: errorMsg,
                  error_type: 'InvalidInput',
                }),
              },
            ],
          };
        }

        const storage = apiClientFactory.getStorageClient();
        const [url] = await storage
          .bucket(params.bucket_name)
          .file(params.object_name)
          .getSignedUrl({
            action: 'write',
            expires: Date.now() + params.expiration_minutes * 60 * 1000, // 15 minutes
            contentType: params.content_type,
          });

        const result = {
          success: true,
          bucket: params.bucket_name,
          object: params.object_name,
          signed_url: url,
          method: 'PUT',
          content_type: params.content_type,
          expiration_minutes: params.expiration_minutes,
          expires_at: new Date(Date.now() + params.expiration_minutes * 60 * 1000).toISOString(),
          usage_example: `curl -X PUT -H 'Content-Type: ${params.content_type}' --upload-file <local-file> '${url}'`,
        };
        logger.info(`Successfully generated upload signed URL for object ${params.object_name}`);
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
        const errorMsg = `Error generating upload signed URL: ${error.message}`;
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
