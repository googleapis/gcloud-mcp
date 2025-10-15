#!/usr/bin/env node

/**
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
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

// --- NEW IMPORTS FOR HTTP STREAMABLE ---
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express, { Request, Response } from "express";
import cors from "cors";
import { Server } from 'http';
// ------------------------------------

// --- HTTP CONFIGURATION ---
const PORT = 3000;
const HOST = '0.0.0.0';
// ------------------------------------


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

// --- NEW FUNCTION TO START HTTP SERVER ---
const startHttpServer = async (server: McpServer): Promise<Server> => {
    console.error(`🚀 Starting Cloud Observability MCP Server with Streamable HTTP on ${HOST}:${PORT}`);

    // Setup Express
    const app = express();
    app.use(express.json());
    app.use(cors({
        origin: '*',
        methods: ['GET', 'POST', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
        exposedHeaders: ['Content-Type', 'Access-Control-Allow-Origin']
    }));

    // Add OPTIONS handling for preflight requests
    // FIX APPLIED: Use a regular expression to match all paths robustly
    app.options(/\/.*/, cors()); 

    // Health check endpoint
    app.get("/health", (_req: Request, res: Response) => {
        res.json({
            status: "ok",
            server: "initialized"
        });
    });

    // Endpoint for StreamableHTTP connection (GET)
    // @ts-ignore
    app.get('/mcp', (req: Request, res: Response) => {
        console.error(`Received GET connection request from ${req.ip}`);
        
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        });
        
        req.on('close', () => {
            console.error('Connection closed on GET /mcp');
        });
    });

    // Main MCP endpoint - stateless mode (POST)
    // @ts-ignore
    app.post('/mcp', async (req: Request, res: Response) => {
        // console.error(`Received POST MCP request from ${req.ip}`); 
        
        try {
            const transport = new StreamableHTTPServerTransport({
                sessionIdGenerator: undefined,
                enableJsonResponse: false,
            });
            
            res.on('close', () => {
                // console.error('Request closed'); 
                transport.close();
            });
            
            await server.connect(transport);
            await transport.handleRequest(req, res, req.body);
            
        } catch (error) {
            console.error('Error handling MCP request:', error);
            if (!res.headersSent) {
                res.status(500).json({
                    jsonrpc: '2.0',
                    error: {
                        code: -32603,
                        message: 'Internal server error',
                        data: error instanceof Error ? error.message : String(error)
                    },
                    id: (req.body as any)?.id || null,
                });
            }
        }
    });

    // Start the HTTP server
    const httpServer = app.listen(PORT, HOST, (error: Error | undefined) => {
        if (error) {
            console.error('Failed to start HTTP server:', error);
            process.exit(1);
        }
        console.error(`Endpoint: http://${HOST}:${PORT}/mcp`);
    });

    return httpServer as Server;
}
// -------------------------------------------------------------

const main = async () => {
    // --- ARGUMENTS FOR $0 COMMAND ---
    const argv = await yargs(hideBin(process.argv))
        .command('$0', 'Run the Cloud Observability MCP server', (yargs) => {
            return yargs.option('http', {
                type: 'boolean',
                default: false,
                description: 'Run the server using Streamable HTTP transport instead of stdio.',
            });
        })
        .command(exitProcessAfter(init))
        .version(pkg.version)
        .help()
        .parse();
    // ------------------------------------

    const server = getServer();
    let httpServer: Server | null = null;

    if (argv['http']) {
        // HTTP Mode
        httpServer = await startHttpServer(server);
    } else {
        // Stdio Mode (Default)
        await server.connect(new StdioServerTransport());
        // eslint-disable-next-line no-console
        console.error('🚀 Cloud Observability MCP server started on stdio');
    }

    // --- GRACEFUL SHUTDOWN HANDLERS ---
    const shutdown = async (signal: string) => {
        // eslint-disable-next-line no-console
        console.error(`\nReceived ${signal}, shutting down gracefully...`);
        await server.close();
        if (httpServer) {
            httpServer.close(() => {
                // eslint-disable-next-line no-console
                console.error('HTTP server closed.');
                process.exit(0);
            });
        } else {
            process.exit(0);
        }
    };

    process.on('uncaughtException', async (err: unknown) => {
        await server.close();
        const error = err instanceof Error ? err : undefined;
        // eslint-disable-next-line no-console
        console.error('❌ Uncaught exception.', error);
        process.exit(1);
    });
    process.on('unhandledRejection', async (reason: unknown, promise: Promise<unknown>) => {
        await server.close();
        const error = reason instanceof Error ? reason : undefined;
        // eslint-disable-next-line no-console
        console.error(`❌ Unhandled rejection: ${promise}`, error);
        process.exit(1);
    });
    
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    // ------------------------------------
};

main().catch((err: unknown) => {
    const error = err instanceof Error ? err : undefined;
    // eslint-disable-next-line no-console
    console.error('❌ Unable to start Cloud Observability MCP server.', error);
    process.exit(1);
});