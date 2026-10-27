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

// V4 signed URLs can be valid for at most 7 days.
// See https://cloud.google.com/storage/docs/access-control/signed-urls
const MAX_EXPIRATION_MINUTES = 7 * 24 * 60;
const DEFAULT_EXPIRATION_MINUTES = 60;

const inputSchema = {
  bucket_name: z.string().describe('The name of the GCS bucket.'),
  object_name: z.string().describe('The name of the object.'),
  expiration_minutes: z
    .number()
    .int()
    .positive()
    .max(MAX_EXPIRATION_MINUTES)
    .optional()
    .describe(
      `How long the signed URL stays valid, in minutes. Defaults to ${DEFAULT_EXPIRATION_MINUTES} minutes. The maximum is ${MAX_EXPIRATION_MINUTES} minutes (7 days).`,
    ),
};

type GenerateSignedUrlParams = z.infer<z.ZodObject<typeof inputSchema>>;

export async function generateSignedUrl(params: GenerateSignedUrlParams): Promise<CallToolResult> {
  const expirationMinutes = params.expiration_minutes ?? DEFAULT_EXPIRATION_MINUTES;
  try {
    logger.info(
      `Generating signed URL for object: ${params.object_name} in bucket: ${params.bucket_name}`,
    );
    const storage = apiClientFactory.getStorageClient();

    const [url] = await storage
      .bucket(params.bucket_name)
      .file(params.object_name)
      .getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: new Date(Date.now() + expirationMinutes * 60 * 1000),
      });

    const result = {
      bucket: params.bucket_name,
      object: params.object_name,
      expiration_minutes: expirationMinutes,
      signed_url: url,
    };

    logger.info(`Successfully generated signed URL for object ${params.object_name}`);
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
    const errorMsg = `Error generating signed URL: ${error.message}`;
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

export const registerGenerateSignedUrlTool = (server: McpServer) => {
  server.registerTool(
    'generate_signed_url',
    {
      description:
        'Generates a signed V4 URL that can be used to download a GCS object directly over HTTPS without downloading the file contents through the MCP server. Use this instead of read_object_content when the user just needs to download or share a file, especially for large or binary files, as the file contents never enter the model context and there is no size limit.',
      inputSchema,
    },
    generateSignedUrl,
  );
};
