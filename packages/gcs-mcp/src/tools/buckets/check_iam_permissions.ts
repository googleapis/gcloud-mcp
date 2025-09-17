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
import { apiClientFactory } from '../../utility/index.js';
import { logger } from '../../utility/logger.js';

export const registerCheckIamPermissionsTool = (server: McpServer) => {
  server.registerTool(
    'check_iam_permissions',
    {
      description: 'Tests IAM permissions for a bucket.',
      inputSchema: {
        bucket_name: z.string().describe('The name of the GCS bucket.'),
        permissions: z.array(z.string()).describe('List of permissions to test.'),
      },
    },
    async (params: { bucket_name: string; permissions: string[] }) => {
      try {
        logger.info(`Testing IAM permissions for bucket: ${params.bucket_name}`);
        const storage = apiClientFactory.getStorageClient();
        const bucket = storage.bucket(params.bucket_name);
        const [allowedPermissions] = await bucket.iam.testPermissions(params.permissions);

        logger.info(`Successfully tested IAM permissions for bucket ${params.bucket_name}`);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  bucket_name: params.bucket_name,
                  requested_permissions: params.permissions,
                  allowed_permissions: allowedPermissions,
                  denied_permissions: params.permissions.filter(
                    (p) => Array.isArray(allowedPermissions) && !allowedPermissions.includes(p),
                  ),
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (e: unknown) {
        const error = e as Error;
        let errorType = 'Unknown';
        if (error.message.includes('Not Found')) {
          errorType = 'NotFound';
        } else if (error.message.includes('Forbidden')) {
          errorType = 'Forbidden';
        }
        const errorMsg = `Error testing IAM permissions: ${error.message}`;
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
    },
  );
};
