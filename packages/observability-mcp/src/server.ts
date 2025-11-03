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
import { registerTools } from './tools/registration.js';
import pkg from '../package.json' with { type: 'json' };
import yargs, { ArgumentsCamelCase, CommandModule } from 'yargs';
import { hideBin } from 'yargs/helpers';
import { init } from './commands/init.js';

import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express, { Request, Response } from 'express';

export const startStreamableHttpServer = async (server: McpServer) => {
  const app = express();
  const port = 3000;

  app.use(express.json());

  app.post('/mcp', async (req: Request, res: Response) => {
    console.info('/mcp Received:', req.body);
    try {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
      res.on('close', () => {
        console.info('Request closed');
        transport.close();
        server.close();
      });
    } catch (error) {
      console.error('Error handling MCP request', error instanceof Error ? error : undefined);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal server error',
          },
          id: null,
        });
      }
    }
  });

  app.listen(port, () => {
    console.info(`🚀 Cloud Observability MCP listening on port ${port}`);
  });
};

const getServer = (): McpServer => {
  const server = new McpServer({
    name: 'observability-mcp',
    version: pkg.version,
    title: 'Cloud Observability MCP',
    description: 'MCP Server for GCP environment for interacting with various Observability APIs',
  });
  registerTools(server);
  return server;
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
    .command('$0', 'Run the Cloud Observability MCP server' , (yargs) =>
      yargs
        .option('transport', {
          type: 'string',
          description: 'Specify the transport type (stdio or http).',
          choices: ['stdio', 'http'] as const,
          default: 'stdio',
        }),
    )
    .command(exitProcessAfter(init))
    .version(pkg.version)
    .help()
    .parse() as {transport?: string;};

  const server = getServer();

  if (argv.transport === 'http') {
    await startStreamableHttpServer(server);
  } else {
    // Start STDIO Transport Server
    await server.connect(new StdioServerTransport());
  }
  await server.connect(new StdioServerTransport());
  // TODO(https://github.com/googleapis/gcloud-mcp/issues/80): Update to use the custom logger once it's made sharable between packages
  // eslint-disable-next-line no-console
  console.error('🚀 Cloud Observability MCP server started');

  process.on('uncaughtException', async (err: unknown) => {
    await server.close();
    const error = err instanceof Error ? err : undefined;
    // TODO(https://github.com/googleapis/gcloud-mcp/issues/80): Update to use the custom logger once it's made sharable between packages
    // eslint-disable-next-line no-console
    console.error('❌ Uncaught exception.', error);
    process.exit(1);
  });
  process.on('unhandledRejection', async (reason: unknown, promise: Promise<unknown>) => {
    await server.close();
    const error = reason instanceof Error ? reason : undefined;
    // TODO(https://github.com/googleapis/gcloud-mcp/issues/80): Update to use the custom logger once it's made sharable between packages
    // eslint-disable-next-line no-console
    console.error(`❌ Unhandled rejection: ${promise}`, error);
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
  // eslint-disable-next-line no-console
  console.error('❌ Unable to start Cloud Observability MCP server.', error);
  process.exit(1);
});
