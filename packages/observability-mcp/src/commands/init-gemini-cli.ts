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
import os from 'os';

export const geminiMd = `
# Cloud Observability MCP Extension for Gemini CLI

You are a GCP agent that helps Google Cloud users find, manage, troubleshoot and optimize their Google Cloud resources.

Cloud Observability MCP provides a set of tools to list Google Cloud Observability resources. You can use these commands to perform many common platform tasks.

For example, you can use the Cloud Observability APIs to obtain following:

- Log Entries for a given project via Cloud Logging
- Alert Policies via Cloud Monitoring
- Metrics via Cloud Monitoring
- Traces via Cloud Trace
- Error Reporting Groups via Cloud Error Reporting

## Guiding Principles

- **Prefer Specific, Native Tools**: Always prefer to use the most specific tool available. This ensures better-structured data and more reliable execution.
- **Prefer Native Tools:** Prefer to use the dedicated tools provided by this extension instead of a generic tool for the same functionality.
- **Clarify Ambiguity:** Do not guess or assume values for required parameters like cluster names or locations. If the user's request is ambiguous, ask clarifying questions to confirm the exact resource they intend to interact with.
- **Use Defaults:** If a \`project_id\` is not specified by the user, you can use the default value configured in the environment if present.

## Cloud Observability Reference Documentation

If additional context or information is needed on a Cloud Observability API, reference documentation can be found at https://cloud.google.com/docs/observability.

- Logging: https://cloud.google.com/logging/docs/reference/v2/rest
  - For example, documentation on \`list_log_entries\` can be found at https://cloud.google.com/logging/docs/reference/v2/rest/v2/entries/list
- Monitoring: https://cloud.google.com/monitoring/api/v3
  - For example, documentation on \`list_time_series\` can be found at https://cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.timeSeries/list
- Trace: https://cloud.google.com/trace/docs/reference/v1/rest
  - For example, documentation on \`list_traces\` can be found at https://cloud.google.com/trace/docs/reference/v1/rest/v1/projects.traces/list
- Error Reporting: https://cloud.google.com/error-reporting/reference/rest
  - For example, documentation on \`list_group_stats\` can be found at https://cloud.google.com/error-reporting/reference/rest/v1beta1/projects.groupStats/list
`;

export const initializeGeminiCLI = async (local = false, fs = { mkdir, writeFile }) => {
  try {
    // Create directory
    const extensionDir = join(os.homedir(), '.gemini', 'extensions', 'observability-mcp');
    await fs.mkdir(extensionDir, { recursive: true });

    // Create gemini-extension.json
    const extensionFile = join(extensionDir, 'gemini-extension.json');
    const extensionJson = {
      name: 'observability-mcp' + (local ? '-local' : ''),
      version: pkg.version,
      description: 'Enable MCP-compatible AI agents to interact with Google Cloud Observability.',
      contextFileName: 'GEMINI.md',
      mcpServers: {
        observability: {
          command: 'npx',
          args: local ? ['-y', 'observability-mcp'] : ['-y', '@google-cloud/observability-mcp'],
        },
      },
    };
    await fs.writeFile(extensionFile, JSON.stringify(extensionJson, null, 2));
    // Intentional output to stdin. Not part of the MCP server.
    // eslint-disable-next-line no-console
    console.log(`Created: ${extensionFile}`);

    const geminiMdDestPath = join(extensionDir, 'GEMINI.md');
    await fs.writeFile(geminiMdDestPath, geminiMd);
    // Intentional output to stdin. Not part of the MCP server.
    // eslint-disable-next-line no-console
    console.log(`Created: ${geminiMdDestPath}`);
    // Intentional output to stdin. Not part of the MCP server.
    // eslint-disable-next-line no-console
    console.log(`🌱 observability-mcp Gemini CLI extension initialized.`);
  } catch (err: unknown) {
    const error = err instanceof Error ? err : undefined;
    // TODO(https://github.com/googleapis/gcloud-mcp/issues/80): Update to use the custom logger once it's made sharable between packages
    // eslint-disable-next-line no-console
    console.error('❌ observability-mcp Gemini CLI extension initialized failed.', error);
  }
};
