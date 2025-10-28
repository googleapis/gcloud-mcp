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

import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import pkg from '../../package.json' with { type: 'json' };
import { log } from '../utility/logger.js';
import os from 'os';

export const geminiMd = `
# gcloud MCP Extension for Gemini CLI

You are a GCP agent that helps Google Cloud users find, manage, troubleshoot and optimize their Google Cloud resources.

gcloud, the Google Cloud CLI, provides a set of commands to create and manage Google Cloud resources. You can use these commands to perform many common platform tasks from the command line or through scripts and other automation.

For example, you can use the gcloud CLI to create and manage the following:

- Compute Engine virtual machine instances and other resources
- Cloud SQL instances
- Google Kubernetes Engine clusters
- Dataproc clusters and jobs
- Cloud DNS managed zones and record sets
- Cloud Deployment Manager deployments
- Cloud Run services and jobs

You can also use the gcloud CLI to deploy App Engine applications, manage authentication, customize local configuration, and perform other tasks.

## Guiding Principles

- **Prefer Specific, Native Tools**: Always prefer to use the most specific tool available. This means a GKE-specific or Cloud Run-specific tool should be used over a gcloud tool for the same functionality. This ensures better-structured data and more reliable execution.
- **Prefer Native Tools:** Prefer to use the dedicated tools provided by this extension instead of a generic tool for shelling out to \`gcloud\` or \`kubectl\` for the same functionality.
- **Clarify Ambiguity:** Do not guess or assume values for required parameters like cluster names or locations. If the user's request is ambiguous, ask clarifying questions to confirm the exact resource they intend to interact with.
- **Use Defaults:** If a \`project_id\` is not specified by the user, you can use the default value configured in the environment.

## gcloud Reference Documentation

If additional context or information is needed on a gcloud command or command group, reference documentation can be found at https://cloud.google.com/sdk/gcloud/reference.

- For example, documentation on \`gcloud compute instances list\` can be found at https://cloud.google.com/sdk/gcloud/reference/compute/instances/list

Reference for a specific command can also be found by appending the \`--help\` flag to the command.

## gcloud Environment Variables and Properties

Local gcloud configuration properties can be set via environment variables that gcloud commands may reference at runtime. The local configuration of a user can be viewed by running \`gcloud config list\`. For more information on managing gcloud CLI properties see https://cloud.google.com/sdk/gcloud/reference/config and https://cloud.google.com/sdk/docs/properties.
`;

export const initializeGeminiCLI = async (
  local = false,
  transport = 'stdio',
  fs = { mkdir, writeFile },
) => {
  try {
    // Create directory
    const extensionDir = join(os.homedir(), '.gemini', 'extensions', 'gcloud-mcp');
    await fs.mkdir(extensionDir, { recursive: true });

    // Create gemini-extension.json
    const extensionFile = join(extensionDir, 'gemini-extension.json');
    const extensionJson = {
      name: 'gcloud-mcp' + (local ? '-local' : ''),
      version: pkg.version,
      description: 'Enable MCP-compatible AI agents to interact with Google Cloud.',
      contextFileName: 'GEMINI.md',
      mcpServers: {},
    };
    if (transport === 'stdio') {
      extensionJson['mcpServers'] = {
        gcloud: {
          command: 'npx',
          args: local ? ['-y', 'gcloud-mcp'] : ['-y', '@google-cloud/gcloud-mcp'],
        },
      };
    } else {
      extensionJson['mcpServers'] = {
        gcloud: {
          // Capitalization of the Url matters
          httpUrl: 'http://localhost:3000/mcp',
        },
      };
    }
    await fs.writeFile(extensionFile, JSON.stringify(extensionJson, null, 2));
    // Intentional output to stdin. Not part of the MCP server.
    // eslint-disable-next-line no-console
    console.log(`Created: ${extensionFile}`);

    // Create GEMINI.md
    const geminiMdDestPath = join(extensionDir, 'GEMINI.md');
    await fs.writeFile(geminiMdDestPath, geminiMd);
    // Intentional output to stdin. Not part of the MCP server.
    // eslint-disable-next-line no-console
    console.log(`Created: ${geminiMdDestPath}`);
    // Intentional output to stdin. Not part of the MCP server.
    // eslint-disable-next-line no-console
    console.log(`🌱 gcloud-mcp Gemini CLI extension initialized.`);
  } catch (err: unknown) {
    const error = err instanceof Error ? err : undefined;
    log.error('❌ gcloud-mcp Gemini CLI extension initialized failed.', error);
  }
};
