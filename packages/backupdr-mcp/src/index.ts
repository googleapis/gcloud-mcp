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
import yargs, { ArgumentsCamelCase, CommandModule } from 'yargs';
import { hideBin } from 'yargs/helpers';
import { init } from './commands/init.js';
import { log } from './utility/logger.js';
import { allTools } from './tools/index.js';

enum AccessLevel {
  READ_ONLY = 'READ_ONLY',
  UPSERT = 'UPSERT',
  ALL = 'ALL',
}

const shouldAllowTool = (toolName: string, accessLevel: AccessLevel): boolean => {
  const lowerCaseToolName = toolName.toLowerCase();
  switch (accessLevel) {
    case AccessLevel.READ_ONLY:
      return (
        lowerCaseToolName.includes('get') ||
        lowerCaseToolName.includes('list') ||
        lowerCaseToolName.includes('fetch') ||
        lowerCaseToolName.includes('find')
      );
    case AccessLevel.UPSERT:
      return !lowerCaseToolName.includes('delete');
    case AccessLevel.ALL:
      return true;
    default:
      return false;
  }
};

const exitProcessAfter = <T, U>(cmd: CommandModule<T, U>): CommandModule<T, U> => ({
  ...cmd,
  handler: async (argv: ArgumentsCamelCase<U>) => {
    await cmd.handler(argv);
    process.exit(0);
  },
});

const main = async () => {
  const argv = await yargs(hideBin(process.argv))
    .option('access-level', {
      describe: 'The access level for the server.',
      type: 'string',
      choices: Object.values(AccessLevel),
      default: AccessLevel.READ_ONLY,
    })
    .command('$0', 'Run the backupdr mcp server', () => {})
    .command(exitProcessAfter(init))
    .version(pkg.version)
    .help()
    .parse();

  const accessLevel = (argv['access-level'] as AccessLevel) || AccessLevel.READ_ONLY;

  const server = new McpServer(
    {
      name: 'backupdr-mcp-server',
      version: pkg.version,
    },
    { capabilities: { tools: {} } },
  );

  const originalRegisterTool = server.registerTool;

  server.registerTool = (name, definition, implementation) => {
    if (shouldAllowTool(name, accessLevel)) {
      return originalRegisterTool.call(server, name, definition, implementation);
    }
    return {
      unregister: () => {},
      callback: implementation,
      definition,
      enabled: true,
      enable: () => {},
      disable: () => {},
      update: () => {},
      remove: () => {},
    };
  };

  allTools.forEach((tool) => tool(server));

  server.registerTool = originalRegisterTool;

  log.info(`🚀 backupdr mcp server started in ${accessLevel} mode`);

  await server.connect(new StdioServerTransport());

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
  log.error('❌ Unable to start backupdr-mcp server.', error);
  process.exit(1);
});
