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
import {
  commonSafeTools,
  destructiveWriteTools,
  otherDestructiveTools,
  safeWriteTools,
} from './tools/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import pkg from '../package.json' with { type: 'json' };
import yargs, { ArgumentsCamelCase, CommandModule } from 'yargs';
import { hideBin } from 'yargs/helpers';
import { init } from './commands/init.js';
import { log } from './utility/logger.js';

const exitProcessAfter = <T, U>(cmd: CommandModule<T, U>): CommandModule<T, U> => ({
  ...cmd,
  handler: async (argv: ArgumentsCamelCase<U>) => {
    await cmd.handler(argv);
    process.exit(0);
  },
});

const main = async () => {
  const argv = await yargs(hideBin(process.argv))
    .command('$0', 'Run the gcs mcp server', (yargs) => {
      yargs.option('enable-destructive-tools', {
        describe: 'Enable tools that can modify or delete existing GCS content.',
        type: 'boolean',
        default: false,
      });
    })
    .command(exitProcessAfter(init))
    .version(pkg.version)
    .help()
    .parse();

  const server = new McpServer(
    {
      name: 'gcs-mcp-server',
      version: pkg.version,
    },
    { capabilities: { tools: {} } },
  );

  // Start with the common tools that are always safe and registered.
  const allTools = [...commonSafeTools];

  if (argv['enable-destructive-tools']) {
    // In destructive mode, add the overwriting tools and other destructive tools.
    allTools.push(...destructiveWriteTools);
    allTools.push(...otherDestructiveTools);
    log.warn(
      'WARNING: Destructive tools are enabled. The agent can now modify and delete GCS data.',
    );
  } else {
    // In safe mode (default), add only the safe, non-overwriting write tools.
    allTools.push(...safeWriteTools);
  }

  for (const registerTool of allTools) {
    registerTool(server);
  }

  await server.connect(new StdioServerTransport());
  log.info(
    `🚀 gcs mcp server started in ${
      argv['enable-destructive-tools'] ? 'destructive' : 'safe'
    } mode`,
  );

  process.on('uncaughtException', async (err: unknown) => {
    await server.close();
    const error = err instanceof Error ? err : undefined;
    log.error('❌ Uncaught exception.', error);
    process.exit(1);
  });
  process.on('unhandledRejection', async (reason: unknown, promise: Promise<unknown>) => {
    await server.close();
    const error = reason instanceof Error ? reason : undefined;
    log.error(`❌ Unhandled rejection: ${promise}`, error);
    process.exit(1);
  });
  process.on('SIGINT', async () => {
    await server.close();
    process.exit(0);
  });
  process.on('SIGTERM', async () => {
    await server.close();
    process.exit(0);
  });
};

main().catch((err: unknown) => {
  const error = err instanceof Error ? err : undefined;
  log.error('❌ Unable to start gcs-mcp server.', error);
  process.exit(1);
});
