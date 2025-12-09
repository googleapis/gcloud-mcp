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

interface GcloudContext {
  account: string | null;
  project: string | null;
  region: string | null;
  zone: string | null;
  configuration: string | null;
}

const parseConfigValue = (output: string): string | null => {
  const trimmed = output.trim();
  return trimmed === '' || trimmed === '(unset)' ? null : trimmed;
};

export const createGetGcloudContext = () => ({
  register: (server: McpServer) => {
    server.registerTool(
      'get_gcloud_context',
      {
        title: 'Get gcloud context',
        description: `Returns the current gcloud CLI context including active account, project, region, zone, and configuration name.

## Use Cases:
- Use this tool at the start of a session to understand the current GCP environment.
- Use this tool to verify which project/account will be used before executing commands.
- Use this tool when the user asks about their current GCP configuration.

## Returns:
- account: The active GCP account email
- project: The default project ID
- region: The default compute region
- zone: The default compute zone
- configuration: The active gcloud configuration name`,
        inputSchema: {},
      },
      async () => {
        const toolLogger = log.mcp('get_gcloud_context', {});
        toolLogger.info('Fetching gcloud context');

        try {
          const [accountResult, projectResult, regionResult, zoneResult, configResult] =
            await Promise.all([
              gcloud.invoke(['config', 'get-value', 'account']),
              gcloud.invoke(['config', 'get-value', 'project']),
              gcloud.invoke(['config', 'get-value', 'compute/region']),
              gcloud.invoke(['config', 'get-value', 'compute/zone']),
              gcloud.invoke([
                'config',
                'configurations',
                'list',
                '--filter=is_active=true',
                '--format=value(name)',
              ]),
            ]);

          const context: GcloudContext = {
            account: parseConfigValue(accountResult.stdout),
            project: parseConfigValue(projectResult.stdout),
            region: parseConfigValue(regionResult.stdout),
            zone: parseConfigValue(zoneResult.stdout),
            configuration: parseConfigValue(configResult.stdout),
          };

          const missingFields: string[] = [];
          if (!context.project) missingFields.push('project');
          if (!context.region) missingFields.push('region');
          if (!context.zone) missingFields.push('zone');

          let output = `# Current gcloud Context

| Property | Value |
|----------|-------|
| Account | ${context.account ?? '(not set)'} |
| Project | ${context.project ?? '(not set)'} |
| Region | ${context.region ?? '(not set)'} |
| Zone | ${context.zone ?? '(not set)'} |
| Configuration | ${context.configuration ?? 'default'} |
`;

          if (missingFields.length > 0) {
            output += `
## Note
The following properties are not set: ${missingFields.join(', ')}.
Some commands may require these values to be specified explicitly.`;
          }

          return {
            content: [{ type: 'text', text: output }],
          };
        } catch (e: unknown) {
          toolLogger.error(
            'get_gcloud_context failed',
            e instanceof Error ? e : new Error(String(e)),
          );
          const msg = e instanceof Error ? e.message : 'An unknown error occurred.';
          return {
            content: [{ type: 'text', text: `Failed to get gcloud context: ${msg}` }],
            isError: true,
          };
        }
      },
    );
  },
});
