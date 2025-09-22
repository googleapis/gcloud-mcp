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
  bucket_name: z.string().describe('The name of the bucket to delete.'),
  force: z
    .boolean()
    .optional()
    .default(false)
    .describe('Whether to force delete non-empty bucket.'),
};

type DeleteBucketParams = z.infer<z.ZodObject<typeof inputSchema>>;

export async function deleteBucket(params: DeleteBucketParams): Promise<CallToolResult> {
  try {
    logger.info(`Deleting bucket: ${params.bucket_name}, force: ${params.force}`);
    const storage = apiClientFactory.getStorageClient();
    const bucket = storage.bucket(params.bucket_name);

    const [exists] = await bucket.exists();
    if (!exists) {
      const errorMsg = `Bucket ${params.bucket_name} not found`;
      logger.warn(errorMsg);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: errorMsg,
              error_type: 'NotFound',
            }),
          },
        ],
      };
    }

    if (params.force) {
      logger.info(`Force deleting all objects in bucket ${params.bucket_name}`);
      await bucket.deleteFiles({ force: true });
    }

    await bucket.delete();

    logger.info(`Successfully deleted bucket ${params.bucket_name}`);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: `Bucket ${params.bucket_name} deleted successfully`,
            bucket_name: params.bucket_name,
            force_delete: params.force,
          }),
        },
      ],
    };
  } catch (e: unknown) {
    const error = e as Error;
    let errorType = 'Unknown';
    let suggestion;
    if (error.message.includes('Not Found')) {
      errorType = 'NotFound';
    } else if (error.message.includes('Forbidden')) {
      errorType = 'Forbidden';
    } else if (error.message.includes('not be empty')) {
      errorType = 'BadRequest';
      suggestion = 'Use force=True to delete non-empty bucket';
    }
    const errorMsg = `Error deleting bucket: ${error.message}`;
    logger.error(errorMsg);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: errorMsg,
            error_type: errorType,
            suggestion,
          }),
        },
      ],
    };
  }
}

export const registerDeleteBucketTool = (server: McpServer) => {
  server.registerTool(
    'delete_bucket',
    {
      description: 'Deletes a bucket.',
      inputSchema,
    },
    deleteBucket,
  );
};
