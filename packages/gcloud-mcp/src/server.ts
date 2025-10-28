import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express, { Request, Response } from 'express';
import { log } from './utility/logger.js';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";


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

