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

export const geminiMdContent = `# GCS MCP Extension for Gemini CLI

You are a GCP agent that helps Google Cloud users find and manage their Google Cloud Storage resources.

Google Cloud Storage (GCS) is a scalable, fully-managed, highly reliable, and cost-efficient object storage service. You can use the tools provided by this extension to interact with GCS.

For example, you can use the tools to:

- List GCS buckets
- Get the largest object for a content type

## Guiding Principles

- **Clarify Ambiguity:** Do not guess or assume values for required parameters like bucket names. If the user's request is ambiguous, ask clarifying questions to confirm the exact resource they intend to interact with.
- **Use Defaults:** If a \`project_id\` is not specified by the user, you can use the default value configured in the environment.
- **Terminology Grounding:** When users ask for "insights datasets," they are referring to BigQuery datasets populated by Storage Insights Configurations.
  Do NOT confuse this with legacy "Inventory Reports" (which export CSV/Parquet files to GCS).
- **Insights Intent Identification:** There is a set of 3 tools called Insights tool which you have to use whenever you detect an Storage Insights intent.
  To identify "Storage Insights Intent" queries, look for prompts focused on analyzing Google Cloud Storage configuration metadata. These requests typically stem from cost optimization, security auditing, or data governance needs. Users ask to aggregate, filter, or or analyze "buckets" and "objects" based on attributes like "size," "age," "location," and "storage class." Key indicators include checks on configurations such as "public access prevention," "versioning," and "lifecycle policies." The queries often involve complex operations, including statistical analysis (correlations, percentiles), ranking, and filtering based on user-defined "tags" or "labels" across projects and regions.
- **Insights Intent Handling:** Queries identified to have a "Storage Insights Intent" MUST be handled by generating BigQuery SQL queries against Storage Insights datasets. Example: "What is the total size of my storage?", "Which bucket has the most objects?", "Show the distribution of my storage classes."
  If the intent is classified as " Storage Insights Intent", proceed to execute the below steps in order:

1. Check if the user provided the \`config_name\` and \`config_location\` of the dataset configuration. If not then ask the user for the \`config_name\` and \`config_location\` of the dataset configuration they would like to use and remember it.
2. If the dataset configuration is available then pass this dataset configuration name and location to get_metadata_table_schema which will return the schema with some hints. If the dataset config name is returned as incorrect, call the list_insights_configs tool and then ask the user to select the correct dataset configuration name and location again and don't list the available configs unless user explicitly asks for it and retry getting the metadata table schema. Remember the schema for the remaining session unless user asks to change the dataset.
3. Once you have the dataset table schema, use it to draft query/queries and call the execute_insights_query tool get relevant data. If the query fails due to some reason, correct it and retry.
   **Note on BigQuery Table References:** When constructing BigQuery SQL queries, ensure that table references are fully qualified with the project ID. The format should be \`project_id.dataset_id.table_id\`. For example, if the project ID is \`my-gcp-project\`, the dataset ID is \`my_dataset\`, and the table ID is \`my_table\`, the reference in the query should be \`my-gcp-project.my_dataset.my_table\`.
4. Based on the query results, answer the users query.

## GCS Reference Documentation

If additional context or information is needed on GCS, reference documentation can be found at https://cloud.google.com/storage/docs.`;

export const initializeGeminiCLI = async (
  local = false,
  enableDestructiveTools = false,
  fs = { mkdir, writeFile },
) => {
  try {
    // Create directory
    const extensionDir = join(os.homedir(), '.gemini', 'extensions', 'storage-mcp');
    await fs.mkdir(extensionDir, { recursive: true });

    // Create gemini-extension.json
    const extensionFile = join(extensionDir, 'gemini-extension.json');
    const commandArgs = local ? ['-y', 'storage-mcp'] : ['-y', '@google-cloud/storage-mcp'];
    if (enableDestructiveTools) {
      commandArgs.push('--enable-destructive-tools=true');
    }
    const extensionJson = {
      name: 'storage-mcp' + (local ? '-local' : ''),
      version: pkg.version,
      description: 'Enable MCP-compatible AI agents to interact with Google Cloud Storage.',
      contextFileName: 'GEMINI.md',
      mcpServers: {
        storage: {
          command: 'npx',
          args: commandArgs,
        },
      },
    };
    await fs.writeFile(extensionFile, JSON.stringify(extensionJson, null, 2));
    // Intentional output to stdin. Not part of the MCP server.
    // eslint-disable-next-line no-console
    console.log(`Created: ${extensionFile}`);

    // Create GEMINI.md
    const geminiMdDestPath = join(extensionDir, 'GEMINI.md');
    await fs.writeFile(geminiMdDestPath, geminiMdContent);
    // Intentional output to stdin. Not part of the MCP server.
    // eslint-disable-next-line no-console
    console.log(`Created: ${geminiMdDestPath}`);
    // Intentional output to stdin. Not part of the MCP server.
    // eslint-disable-next-line no-console
    console.log(`🌱 storage-mcp Gemini CLI extension initialized.`);
  } catch (err: unknown) {
    const error = err instanceof Error ? err : undefined;
    log.error('❌ storage-mcp Gemini CLI extension initialized failed.', error);
  }
};
