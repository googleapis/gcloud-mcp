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
import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';
import { apiClientFactory } from '../../utility/index.js';
import { getContentType } from '../../utility/gcs_helpers.js';
import { logger } from '../../utility/logger.js';
import { validateLocalPath, getPathBaseDir } from '../../utility/path_validation.js';

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

type UploadObjectParams = z.infer<z.ZodObject<typeof inputSchema>>;

export async function uploadObject(params: UploadObjectParams): Promise<CallToolResult> {
  try {
    let resolvedPath = params.file_path;
    const baseDir = getPathBaseDir();
    if (baseDir) {
      try {
        resolvedPath = validateLocalPath(params.file_path, baseDir);
      } catch (e) {
        const errorMsg = (e as Error).message;
        logger.error(errorMsg);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: errorMsg,
                error_type: 'InvalidPath',
              }),
            },
          ],
        };
      }
    }

    logger.info(`Uploading file: ${resolvedPath} to bucket: ${params.bucket_name}`);

    if (!fs.existsSync(resolvedPath)) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: `File not found at path: ${resolvedPath}`,
              error_type: 'FileNotFound',
            }),
          },
        ],
      };
    }

    const objectName = params.object_name || path.basename(resolvedPath);
    const final_content_type = params.content_type || getContentType(objectName);

    const storage = apiClientFactory.getStorageClient();

    const [file] = await storage.bucket(params.bucket_name).upload(resolvedPath, {
      destination: objectName,
      metadata: { contentType: final_content_type },
    });

    const [metadata] = await file.getMetadata();

    const result = {
      success: true,
      message: `File ${resolvedPath} uploaded successfully to gs://${params.bucket_name}/${objectName}`,
      bucket: params.bucket_name,
      object: objectName,
      size: metadata.size,
      content_type: metadata.contentType,
    };
    logger.info(
      `Successfully uploaded file ${resolvedPath} to bucket ${params.bucket_name} as ${objectName} (${metadata.size} bytes)`,
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

export const registerUploadObjectTool = (server: McpServer) => {
  server.registerTool(
    'upload_object',
    {
      description: 'Uploads a file to a GCS bucket.',
      inputSchema,
    },
    uploadObject,
  );
};
