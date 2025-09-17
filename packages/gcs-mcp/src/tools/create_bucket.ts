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
import { logger } from '../utility/logger.js';
import { CreateBucketRequest } from '@google-cloud/storage';

export const registerCreateBucketTool = (server: McpServer) => {
  server.registerTool(
    'create_bucket',
    {
      description: 'Creates a new bucket with specified configuration.',
      inputSchema: {
        project_id: z.string().describe('The ID of the GCP project.'),
        bucket_name: z.string().describe('The name of the bucket to create.'),
        location: z
          .string()
          .optional()
          .default('US')
          .describe('The location for the bucket.'),
        storage_class: z
          .string()
          .optional()
          .default('STANDARD')
          .describe('The storage class for the bucket.'),
        labels: z
          .record(z.string())
          .optional()
          .describe('Labels to apply to the bucket.'),
        versioning_enabled: z
          .boolean()
          .optional()
          .default(false)
          .describe('Whether to enable versioning.'),
        requester_pays: z
          .boolean()
          .optional()
          .default(false)
          .describe('Whether to enable requester pays.'),
      },
    },
    async (params: {
      project_id: string;
      bucket_name: string;
      location: string;
      storage_class: string;
      labels?: Record<string, string> | undefined;
      versioning_enabled: boolean;
      requester_pays: boolean;
    }) => {
      try {
        logger.info(
          `Creating bucket: ${params.bucket_name} in project: ${params.project_id}`
        );
        const storage = apiClientFactory.getStorageClient();
        const options: CreateBucketRequest = {
          location: params.location,
          storageClass: params.storage_class,
          versioning: {
            enabled: params.versioning_enabled,
          },
          userProject: params.project_id,
          requesterPays: params.requester_pays,
        };
        if (params.labels) {
          options.labels = params.labels;
        }
        const [bucket] = await storage.createBucket(
          params.bucket_name,
          options
        );

        const [metadata] = await bucket.getMetadata();

        logger.info(
          `Successfully created bucket ${params.bucket_name} in project ${params.project_id}`
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: `Bucket ${params.bucket_name} created successfully in project ${params.project_id}`,
                bucket: metadata,
              }),
            },
          ],
        };
      } catch (e: unknown) {
        const error = e as Error;
        let errorType = 'Unknown';
        if (error.message.includes('already exists')) {
          errorType = 'Conflict';
        } else if (error.message.includes('Not Found')) {
          errorType = 'NotFound';
        } else if (error.message.includes('Forbidden')) {
          errorType = 'Forbidden';
        } else if (error.message.includes('Invalid')) {
          errorType = 'BadRequest';
        }
        const errorMsg = `Error creating bucket: ${error.message}`;
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
  );
};
