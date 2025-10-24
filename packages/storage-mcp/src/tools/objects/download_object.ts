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
  object_name: z.string().describe('The name of the object to download.'),
  file_path: z.string().describe('The local path to save the downloaded file to.'),
};

type DownloadObjectParams = z.infer<z.ZodObject<typeof inputSchema>>;

export async function downloadObject(params: DownloadObjectParams): Promise<CallToolResult> {
  try {
    const storage = apiClientFactory.getStorageClient();
    await storage
      .bucket(params.bucket_name)
      .file(params.object_name)
      .download({ destination: params.file_path });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: `Object ${params.object_name} from bucket ${params.bucket_name} downloaded to ${params.file_path}.`,
          }),
        },
      ],
    };
  } catch (e) {
    const error = e as Error;
    logger.error(error.message);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error.message,
          }),
        },
      ],
    };
  }
}

export const registerDownloadObjectTool = (server: McpServer) => {
  server.registerTool(
    'download_object',
    {
      description: 'Downloads an object from GCS to a local file.',
      inputSchema,
    },
    downloadObject,
  );
};
