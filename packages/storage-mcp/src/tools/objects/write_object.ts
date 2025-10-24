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
import { getContentType, validateBase64Content } from '../../utility/gcs_helpers.js';
import { logger } from '../../utility/logger.js';

const inputSchema = {
  bucket_name: z.string().describe('The name of the GCS bucket.'),
  object_name: z.string().describe('The name of the object to write.'),
  content: z.string().describe('The content to write to the object, encoded in base64.'),
  content_type: z.string().optional().describe('The content type of the object.'),
};

type WriteObjectParams = z.infer<z.ZodObject<typeof inputSchema>>;

export async function writeObject(params: WriteObjectParams): Promise<CallToolResult> {
  try {
    logger.info(`Writing object: ${params.object_name} to bucket: ${params.bucket_name}`);

    let decoded_content: Buffer;
    try {
      validateBase64Content(params.content);
      decoded_content = Buffer.from(params.content, 'base64');
    } catch (e: unknown) {
      const errorMsg = (e as Error).message;
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

    const final_content_type = params.content_type || getContentType(params.object_name);

    const storage = apiClientFactory.getStorageClient();

    await storage
      .bucket(params.bucket_name)
      .file(params.object_name)
      .save(decoded_content, { contentType: final_content_type });

    const result = {
      success: true,
      message: `Object ${params.object_name} written successfully to bucket ${params.bucket_name}`,
      bucket: params.bucket_name,
      object: params.object_name,
      size: decoded_content.byteLength,
      content_type: final_content_type,
    };
    logger.info(
      `Successfully wrote object ${params.object_name} to bucket ${params.bucket_name} (${decoded_content.byteLength} bytes)`,
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
    } else if (error.message.includes('Invalid')) {
      errorType = 'BadRequest';
    }
    const errorMsg = `Error writing object: ${error.message}`;
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

export const registerWriteObjectTool = (server: McpServer) => {
  server.registerTool(
    'write_object',
    {
      description: 'Writes a new object to the bucket.',
      inputSchema,
    },
    writeObject,
  );
};
