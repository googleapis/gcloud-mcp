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

import { File, GetFilesOptions } from '@google-cloud/storage';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { apiClientFactory } from '../../utility/index.js';
import { logger } from '../../utility/logger.js';

const inputSchema = {
  bucket_name: z.string().describe('The name of the GCS bucket.'),
  prefix: z
    .string()
    .optional()
    .describe('Filters results to objects whose names begin with this prefix.'),
  delimiter: z
    .string()
    .optional()
    .describe(
      "Can be used to list objects in a directory-like structure. For example, using a delimiter of '/' will return objects at the root level and not in subdirectories. This helps in navigating virtual folder hierarchies.",
    ),
  max_results: z
    .number()
    .optional()
    .describe(
      'The maximum number of object names to return in a single response. If not specified, the API defaults to 1,000. The maximum value allowed is also 1,000.',
    ),
  page_token: z
    .string()
    .optional()
    .describe(
      'A token used to retrieve the next page of results. This is obtained from the `next_page_token` field of a previous `list_objects` call.',
    ),
  versions: z
    .boolean()
    .optional()
    .describe('If true, lists all versions of an object as distinct results.'),
};

type ListObjectsParams = z.infer<z.ZodObject<typeof inputSchema>>;

export async function listObjects(params: ListObjectsParams): Promise<CallToolResult> {
  try {
    logger.info(
      `Listing objects in bucket: ${params.bucket_name}, prefix: ${params.prefix}, delimiter: ${params.delimiter}, max_results: ${params.max_results}, page_token: ${params.page_token}, versions: ${params.versions}`,
    );
    const storage = apiClientFactory.getStorageClient();
    const options: GetFilesOptions = {};
    if (params.prefix) {
      options.prefix = params.prefix;
    }
    if (params.delimiter) {
      options.delimiter = params.delimiter;
    }
    if (params.max_results) {
      options.maxResults = params.max_results;
    }
    if (params.page_token) {
      options.pageToken = params.page_token;
    }
    if (params.versions) {
      options.versions = params.versions;
    }
    const [files, nextQuery] = await storage.bucket(params.bucket_name).getFiles(options);

    const objectList = files.map((file: File) => file.name);

    const result = {
      bucket: params.bucket_name,
      prefix: params.prefix,
      delimiter: params.delimiter,
      object_count: objectList.length,
      objects: objectList,
      next_page_token: nextQuery?.pageToken ?? null,
    };

    logger.info(
      `Successfully listed ${objectList.length} objects from bucket ${params.bucket_name}`,
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
    const errorMsg = `Error listing objects: ${error.message}`;
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

export const registerListObjectsTool = (server: McpServer) => {
  server.registerTool(
    'list_objects',
    {
      description:
        'Lists the names of objects in a Google Cloud Storage (GCS) bucket. Supports filtering by prefix, directory-like listing with a delimiter, pagination, and listing object versions.',
      inputSchema,
    },
    listObjects,
  );
};
