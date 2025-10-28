import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express, { Request, Response } from 'express';
import { log, logger } from './utility/logger.js';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";


export const startStreamableHttpServer = async (server: McpServer) => {
  const app = express();
  const port = 3000;

  app.use(express.json());

  app.post('/mcp', async (req: Request, res: Response) => {
    logger.info('/mcp Received:', req.body);
    try {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
      res.on('close', () => {
        console.log('Request closed');
        transport.close();
        server.close();
      });
    } catch (error) {
      console.error('Error handling MCP request:', error);
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

