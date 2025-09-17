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
import { BucketMetadata } from '@google-cloud/storage';

export const registerUpdateBucketLabelsTool = (server: McpServer) => {
  server.registerTool(
    'update_bucket_labels',
    {
      description: 'Updates labels for a bucket.',
      inputSchema: {
        bucket_name: z.string().describe('The name of the bucket.'),
        labels: z
          .record(z.string())
          .describe('Dictionary of labels to set on the bucket.'),
      },
    },
    async (params: { bucket_name: string; labels: Record<string, string> }) => {
      try {
        logger.info(`Updating labels for bucket: ${params.bucket_name}`);
        const storage = apiClientFactory.getStorageClient();
        const bucket = storage.bucket(params.bucket_name);
        const [metadata] = await bucket.setLabels(params.labels);

        logger.info(
          `Successfully updated labels for bucket ${params.bucket_name}`
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: `Labels for bucket ${params.bucket_name} updated successfully`,
                  bucket_name: params.bucket_name,
                  updated_labels: (metadata as BucketMetadata).labels,
                },
                null,
                2
              ),
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
        } else if (error.message.includes('Invalid')) {
          errorType = 'BadRequest';
        }
        const errorMsg = `Error updating bucket labels: ${error.message}`;
        logger.error(errorMsg);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: errorMsg,
                error_type: errorType,
              }),
            },
          ],
        };
      }
    }
  );
};