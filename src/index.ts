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
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import pkg from '../package.json' with { type: 'json' };
import { registerRunGcloudCommand } from './tools/run_gcloud_command.js';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const initializeGeminiCLI = () => {
  const extensionDir = join(process.cwd(), '.gemini', 'extensions', 'gcloud-mcp');
  mkdirSync(extensionDir, { recursive: true });
  const extensionFile = join(extensionDir, 'gemini-extension.json');
  const content = {
    name: 'gcloud-mcp',
    version: '0.1.0-test',
    description: 'Enable MCP-compatible AI agents to interact with Google Cloud.',
    contextFileName: 'GEMINI.md',
    mcpServers: {
      gcloud: {
        command: 'npm',
        args: ['start'],
      },
    },
  };
  writeFileSync(extensionFile, JSON.stringify(content, null, 2));
  console.log(`Gemini CLI extension initialized at: ${extensionFile}`);
};

const main = async () => {
  const argv = await yargs(hideBin(process.argv)).option('gemini-cli-init', {
    alias: 'init',
    type: 'boolean',
    description: 'Initialize the Gemini CLI extension',
  }).argv;

  if (argv.geminiCliInit) {
    initializeGeminiCLI();
    return;
  }

  const server = new McpServer({
    name: 'gcloud-mcp-server',
    version: pkg.version,
  });

  registerRunGcloudCommand(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log('🚀 gcloud mcp server started');
};

main();
