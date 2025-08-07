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
import * as gcloud from './gcloud.js';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { initializeGeminiCLI } from './gemini-cli-init.js';

const main = async () => {
  const argv = await yargs(hideBin(process.argv)).option('gemini-cli-init', {
    alias: 'init',
    type: 'boolean',
    description: 'Initialize the Gemini CLI extension',
  }).argv;

  if (argv.geminiCliInit) {
    await initializeGeminiCLI();
    return;
  }

  const isAvailable = await gcloud.isAvailable();
  if (!isAvailable) {
    console.log('Unable to start gcloud mcp server: gcloud executable not found.');
  }

  const server = new McpServer({
    name: 'gcloud-mcp-server',
    version: pkg.version,
  });
  registerRunGcloudCommand(server);
  await server.connect(new StdioServerTransport());
  console.log('🚀 gcloud mcp server started');
};

main();
