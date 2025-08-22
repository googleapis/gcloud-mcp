#!/usr/bin/env node

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
import { createRunGcloudCommand } from './tools/run_gcloud_command.js';
import * as gcloud from './gcloud.js';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { init } from './commands/init.js';
import {log} from './utility/logger.js';


export const default_denylist: string[] = [
  'compute start-iap-tunnel',
  'compute connect-to-serial-port',
  'compute tpus tpu-vm ssh',
  'compute tpus queued-resources ssh',
  'compute ssh',
  'cloud-shell ssh',
  'workstations ssh',
  'app instances ssh',
];

const main = async () => {
  yargs(hideBin(process.argv))
    .command('$0', 'Run the gcloud mcp server', async () => {
      const isAvailable = await gcloud.isAvailable();
      if (!isAvailable) {
        log.error('Unable to start gcloud mcp server: gcloud executable not found.');
        process.exit(1);
      }

      const denyListSet = [...new Set([...default_denylist])];

      const server = new McpServer(
        {
          name: 'gcloud-mcp-server',
          version: pkg.version,
        },
        { capabilities: { tools: {} } },
      );
      createRunGcloudCommand(denyListSet).register(server);
      await server.connect(new StdioServerTransport());
      log.info('🚀 gcloud mcp server started');
    })
    .command(init)
    .version(false)
    .help()
    .parse();
};

main();
