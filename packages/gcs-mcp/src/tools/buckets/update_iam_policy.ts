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
import { Policy } from '@google-cloud/storage';

export const registerUpdateIamPolicyTool = (server: McpServer) => {
  server.registerTool(
    'update_iam_policy',
    {
      description: 'Updates the IAM policy for a bucket.',
      inputSchema: {
        bucket_name: z.string().describe('The name of the GCS bucket.'),
        policy_updates: z
          .any()
          .describe('The policy updates to apply.')
          .optional(),
      },
    },
    async (params: { bucket_name: string; policy_updates?: Policy }) => {
      try {
        logger.info(`Updating IAM policy for bucket: ${params.bucket_name}`);
        const storage = apiClientFactory.getStorageClient();
        const bucket = storage.bucket(params.bucket_name);
        const [policy] = await bucket.iam.getPolicy({
          requestedPolicyVersion: 3,
        });

        // The nodejs library bindings are not a direct mapping to the python library
        // In nodejs, we set the entire policy, so we need to merge the changes
        // rather than add/remove individual bindings.
        // We will overwrite the bindings with the new bindings from the request.
        if (params.policy_updates) {
          policy.bindings = params.policy_updates.bindings;
          if (params.policy_updates.version) {
            policy.version = params.policy_updates.version;
          }
          if (params.policy_updates.etag) {
            policy.etag = params.policy_updates.etag;
          }
        }

        const [updatedPolicy] = await bucket.iam.setPolicy(policy);

        logger.info(
          `Successfully updated IAM policy for bucket ${params.bucket_name}`
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: `IAM policy for bucket ${params.bucket_name} updated successfully`,
                  bucket_name: params.bucket_name,
                  updated_policy: updatedPolicy,
                },
                null,
                2
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
        } else if (error.message.includes('Invalid')) {
          errorType = 'BadRequest';
        }
        const errorMsg = `Error updating IAM policy: ${error.message}`;
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
