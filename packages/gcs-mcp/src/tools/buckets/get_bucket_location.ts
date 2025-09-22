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
  bucket_name: z.string().describe('The name of the bucket.'),
};

type GetBucketLocationParams = z.infer<z.ZodObject<typeof inputSchema>>;

export async function getBucketLocation(params: GetBucketLocationParams): Promise<CallToolResult> {
  try {
    logger.info(`Getting location for bucket: ${params.bucket_name}`);
    const storage = apiClientFactory.getStorageClient();
    const bucket = storage.bucket(params.bucket_name);
    const [metadata] = await bucket.getMetadata();

    logger.info(`Successfully retrieved location for bucket ${params.bucket_name}`);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              bucket_name: params.bucket_name,
              location: metadata.location,
              location_type: metadata.locationType,
              storage_class: metadata.storageClass,
              time_created: metadata.timeCreated,
              updated: metadata.updated,
            },
            null,
            2,
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
    }
    const errorMsg = `Error getting bucket location: ${error.message}`;
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

export const registerGetBucketLocationTool = (server: McpServer) => {
  server.registerTool(
    'get_bucket_location',
    {
      description: 'Gets the location and storage class of a bucket.',
      inputSchema,
    },
    getBucketLocation,
  );
};
