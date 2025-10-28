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

import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express, { Request, Response } from 'express';
import { log } from './utility/logger.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export const startStreamableHttpServer = async (server: McpServer) => {
  const app = express();
  const port = 3000;

  app.use(express.json());

  app.post('/mcp', async (req: Request, res: Response) => {
    log.info('/mcp Received:', req.body);
    try {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
      res.on('close', () => {
        log.info('Request closed');
        transport.close();
        server.close();
      });
    } catch (error) {
      log.error('Error handling MCP request', error instanceof Error ? error : undefined);
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
    log.info(`🚀 gcloud mcp server listening on port ${port}`);
  });
};
