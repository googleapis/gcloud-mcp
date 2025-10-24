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

import { ApiError } from '@google-cloud/storage';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs';
import { z } from 'zod';
import { apiClientFactory } from '../../utility/index.js';
import { getContentType } from '../../utility/gcs_helpers.js';
import { logger } from '../../utility/logger.js';

const inputSchema = {
  bucket_name: z.string().describe('The name of the GCS bucket.'),
  file_path: z.string().describe('The local path of the file to upload.'),
  object_name: z
    .string()
    .optional()
    .describe(
      'The name of the object in GCS. If not provided, the filename from file_path will be used.',
    ),
  content_type: z.string().optional().describe('The content type of the object.'),
};

type UploadObjectSafeParams = z.infer<z.ZodObject<typeof inputSchema>>;

export async function uploadObjectSafe(params: UploadObjectSafeParams): Promise<CallToolResult> {
  try {
    logger.info(`Uploading safe file: ${params.file_path} to bucket: ${params.bucket_name}`);

    if (!fs.existsSync(params.file_path)) {
      const errorMsg = `File not found at path: ${params.file_path}`;
      logger.error(errorMsg);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: errorMsg,
              error_type: 'NotFound',
            }),
          },
        ],
      };
    }

    const storage = apiClientFactory.getStorageClient();
    const bucket = storage.bucket(params.bucket_name);
    const objectName = params.object_name || params.file_path.split('/').pop();
    if (!objectName) {
      throw new Error(`Could not determine object name from file path: ${params.file_path}`);
    }
    const file = bucket.file(objectName, { generation: 0 });

    const contentType = params.content_type || getContentType(params.file_path);

    await file.save(fs.readFileSync(params.file_path), {
      contentType,
    });

    const [metadata] = await file.getMetadata();

    const result = {
      success: true,
      message: `File ${params.file_path} uploaded successfully to gs://${params.bucket_name}/${objectName}`,
      bucket: params.bucket_name,
      object: objectName,
      size: metadata.size,
      content_type: metadata.contentType,
    };
    logger.info(
      `Successfully uploaded file ${params.file_path} to gs://${params.bucket_name}/${objectName}`,
    );
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  } catch (e: unknown) {
    const error = e as ApiError;
    let errorType = 'Unknown';
    if (error.code === 412) {
      errorType = 'AlreadyExists';
    } else if (error.errors && error.errors[0] && error.errors[0].reason) {
      if (error.errors[0].reason === 'conditionNotMet') {
        errorType = 'AlreadyExists';
      }
    }
    const errorMsg = `Error uploading file: ${error.message}`;
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

export const registerUploadObjectSafeTool = (server: McpServer) => {
  server.registerTool(
    'upload_object_safe',
    {
      description: 'Uploads a file to a GCS bucket. Fails if the object already exists.',
      inputSchema,
    },
    uploadObjectSafe,
  );
};
