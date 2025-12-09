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
import * as gcloud from '../gcloud.js';
import { log } from '../utility/logger.js';
import { z } from 'zod';

interface PermissionCheckResult {
  permission: string;
  granted: boolean;
}

export const createCheckIamPermissions = () => ({
  register: (server: McpServer) => {
    server.registerTool(
      'check_iam_permissions',
      {
        title: 'Check IAM permissions',
        description: `Checks whether the current authenticated account has specific IAM permissions on a GCP resource.

## Use Cases:
- Use this tool BEFORE running a command to verify you have the necessary permissions.
- Use this tool to debug "permission denied" errors by checking which permissions are missing.
- Use this tool to verify access to a specific project or resource.

## Common Permissions:
- compute.instances.create - Create VMs
- storage.buckets.create - Create GCS buckets
- run.services.create - Deploy Cloud Run services
- cloudfunctions.functions.create - Deploy Cloud Functions
- container.clusters.create - Create GKE clusters

## Returns:
A list of permissions with their granted/denied status.`,
        inputSchema: {
          project: z.string().describe('The GCP project ID to check permissions against'),
          permissions: z
            .array(z.string())
            .describe(
              'List of IAM permissions to check (e.g., ["compute.instances.create", "storage.buckets.list"])',
            ),
        },
      },
      async ({ project, permissions }) => {
        const toolLogger = log.mcp('check_iam_permissions', { project, permissions });
        toolLogger.info('Checking IAM permissions');

        try {
          const results: PermissionCheckResult[] = [];

          const policyResult = await gcloud.invoke([
            'projects',
            'get-iam-policy',
            project,
            '--flatten=bindings[].members',
            '--format=value(bindings.role)',
            '--filter=bindings.members:*',
          ]);

          if (policyResult.code !== 0) {
            return {
              content: [
                {
                  type: 'text',
                  text: `Failed to check permissions: ${policyResult.stderr || 'Unknown error'}`,
                },
              ],
              isError: true,
            };
          }

          const testResult = await gcloud.invoke([
            'projects',
            'test-iam-permissions',
            project,
            `--permissions=${permissions.join(',')}`,
            '--format=json',
          ]);

          if (testResult.code !== 0) {
            return {
              content: [
                {
                  type: 'text',
                  text: `Failed to test permissions: ${testResult.stderr || 'Unknown error'}`,
                },
              ],
              isError: true,
            };
          }

          let grantedPermissions: string[] = [];
          try {
            const parsed = JSON.parse(testResult.stdout);
            grantedPermissions = parsed.permissions || [];
          } catch {
            grantedPermissions = [];
          }

          for (const permission of permissions) {
            results.push({
              permission,
              granted: grantedPermissions.includes(permission),
            });
          }

          const granted = results.filter((r) => r.granted);
          const denied = results.filter((r) => !r.granted);

          let output = `# IAM Permission Check Results

**Project:** ${project}

## Summary
- ✅ Granted: ${granted.length}
- ❌ Denied: ${denied.length}

## Details

| Permission | Status |
|------------|--------|
`;

          for (const result of results) {
            const status = result.granted ? '✅ Granted' : '❌ Denied';
            output += `| ${result.permission} | ${status} |\n`;
          }

          if (denied.length > 0) {
            output += `
## Missing Permissions

The following permissions are not granted to your account:
${denied.map((d) => `- ${d.permission}`).join('\n')}

To request these permissions, contact your project administrator or request a role that includes them.`;
          }

          return {
            content: [{ type: 'text', text: output }],
          };
        } catch (e: unknown) {
          toolLogger.error(
            'check_iam_permissions failed',
            e instanceof Error ? e : new Error(String(e)),
          );
          const msg = e instanceof Error ? e.message : 'An unknown error occurred.';
          return {
            content: [{ type: 'text', text: `Failed to check IAM permissions: ${msg}` }],
            isError: true,
          };
        }
      },
    );
  },
});
