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
  bucket_name: z.string().describe('The name of the GCS bucket.'),
  object_name: z.string().describe('The name of the object.'),
  expiration_minutes: z.number().optional().default(15).describe('URL expiration time in minutes.'),
};

type GenerateDownloadSignedUrlParams = z.infer<z.ZodObject<typeof inputSchema>>;

export async function generateDownloadSignedUrl(
  params: GenerateDownloadSignedUrlParams,
): Promise<CallToolResult> {
  try {
    logger.info(
      `Generating download signed URL for object: ${params.object_name} in bucket: ${params.bucket_name}`,
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
        action: 'read',
        expires: Date.now() + params.expiration_minutes * 60 * 1000, // 15 minutes
      });

    const blob = await storage.bucket(params.bucket_name).file(params.object_name).get();

    const result = {
      success: true,
      bucket: params.bucket_name,
      object: params.object_name,
      signed_url: url,
      method: 'GET',
      expiration_minutes: params.expiration_minutes,
      expires_at: new Date(Date.now() + params.expiration_minutes * 60 * 1000).toISOString(),
      object_size: blob[0].metadata.size,
      content_type: blob[0].metadata.contentType,
    };
    logger.info(`Successfully generated download signed URL for object ${params.object_name}`);
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
    const errorMsg = `Error generating download signed URL: ${error.message}`;
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

export const registerGenerateDownloadSignedUrlTool = (server: McpServer) => {
  server.registerTool(
    'generate_download_signed_url',
    {
      description: 'Generates a signed URL for downloading an object from GCS.',
      inputSchema,
    },
    generateDownloadSignedUrl,
  );
};
