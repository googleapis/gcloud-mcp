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
  source_bucket_name: z.string().describe('The name of the source GCS bucket.'),
  source_object_name: z.string().describe('The name of the source object.'),
  destination_bucket_name: z.string().describe('The name of the destination GCS bucket.'),
  destination_object_name: z.string().describe('The name for the copied object.'),
};

type CopyObjectParams = z.infer<z.ZodObject<typeof inputSchema>>;

export async function copyObject(params: CopyObjectParams): Promise<CallToolResult> {
  try {
    logger.info(
      `Copying object: ${params.source_object_name} from bucket: ${params.source_bucket_name} to ${params.destination_object_name} in bucket: ${params.destination_bucket_name}`,
    );

    const storage = apiClientFactory.getStorageClient();
    const destinationBucket = storage.bucket(params.destination_bucket_name);
    const destinationFile = destinationBucket.file(params.destination_object_name);
    const [copiedFile] = await storage
      .bucket(params.source_bucket_name)
      .file(params.source_object_name)
      .copy(destinationFile);

    const result = {
      success: true,
      message: `Object ${params.source_object_name} copied successfully from bucket ${params.source_bucket_name} to ${params.destination_object_name} in bucket ${params.destination_bucket_name}`,
      source_bucket: params.source_bucket_name,
      source_object: params.source_object_name,
      destination_bucket: params.destination_bucket_name,
      destination_object: params.destination_object_name,
      copied_object_size: copiedFile.metadata.size,
      copied_object_generation: copiedFile.metadata.generation,
    };
    logger.info(
      `Successfully copied object ${params.source_object_name} to ${params.destination_object_name}`,
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
    const errorMsg = `Error copying object: ${error.message}`;
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

export const registerCopyObjectTool = (server: McpServer) => {
  server.registerTool(
    'copy_object',
    {
      description: 'Copies an object from one bucket to another or within the same bucket.',
      inputSchema,
    },
    copyObject,
  );
};
