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
import { z } from 'zod';
import { apiClientFactory } from '../utility/index.js';

export const registerListGcsBucketsTool = (server: McpServer) => {
  server.registerTool(
    'list_gcs_buckets',
    {
      description: 'Lists all GCS buckets in the project.',
      inputSchema: {
        project_id: z.string().optional().describe('The project ID to list buckets for.'),
      },
    },
    async (params: { project_id?: string | undefined }) => {
      const storage = apiClientFactory.getStorageClient();
      const projectId = params.project_id || process.env['GOOGLE_CLOUD_PROJECT'];
      if (!projectId) {
        throw new Error(
          'Project ID not specified. Please specify via the project_id parameter or GOOGLE_CLOUD_PROJECT environment variable.',
        );
      }
      const [buckets] = await storage.getBuckets({ userProject: projectId });

      if (!buckets || buckets.length === 0) {
        return { content: [{ type: 'text', text: 'No buckets found.' }] };
      }
      const bucketNames = buckets
        .map((bucket) => bucket.name)
        .filter((name): name is string => !!name);

      return { content: [{ type: 'text', text: bucketNames.join('\n') }] };
    },
  );
};
