/**
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may not use this file except in compliance with the License.
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
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { startStreamableHttpServer } from './server.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import express from 'express';

// Mock express and its components
const mockApp = {
  use: vi.fn(),
  post: vi.fn(),
  listen: vi.fn(),
};
vi.mock('express', () => {
  const express = vi.fn(() => mockApp) as any;
  express.json = vi.fn(() => 'json-parser-middleware');
  return {
    default: express,
  };
});

// Mock MCP Server
const mockServer = {
  connect: vi.fn(),
  close: vi.fn(),
};
vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: vi.fn(() => mockServer),
}));

// Mock MCP Transport
const mockTransport = {
  handleRequest: vi.fn(),
  close: vi.fn(),
};
vi.mock('@modelcontextprotocol/sdk/server/streamableHttp.js', () => ({
  StreamableHTTPServerTransport: vi.fn(() => mockTransport),
}));

describe('startStreamableHttpServer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should start the server and listen on the correct port', async () => {
    await startStreamableHttpServer(mockServer as unknown as McpServer);
    expect(express).toHaveBeenCalled();
    expect(mockApp.use).toHaveBeenCalledWith('json-parser-middleware');
    expect(mockApp.post).toHaveBeenCalledWith('/mcp', expect.any(Function));
    expect(mockApp.listen).toHaveBeenCalledWith(3000, expect.any(Function));
  });

  it('should handle a valid MCP request', async () => {
    await startStreamableHttpServer(mockServer as unknown as McpServer);

    const postCall = mockApp.post.mock.calls[0];
    if (!postCall) {
      expect(mockApp.post).toHaveBeenCalled();
      return;
    }
    const handler = postCall[1];
    const req = { body: 'test-request' };
    const res = { on: vi.fn() };

    await handler(req, res);

    expect(mockServer.connect).toHaveBeenCalledWith(mockTransport);
    expect(mockTransport.handleRequest).toHaveBeenCalledWith(req, res, req.body);
  });

  it('should close transport and server when the request is closed', async () => {
    await startStreamableHttpServer(mockServer as unknown as McpServer);

    const postCall = mockApp.post.mock.calls[0];
    if (!postCall) {
      expect(mockApp.post).toHaveBeenCalled();
      return;
    }
    const handler = postCall[1];
    const req = { body: 'test-request' };
    const res = { on: vi.fn() };

    await handler(req, res);

    const closeCall = res.on.mock.calls[0];
    if (!closeCall) {
      expect(res.on).toHaveBeenCalled();
      return;
    }
    const closeCallback = closeCall[1];
    closeCallback();

    expect(mockTransport.close).toHaveBeenCalled();
    expect(mockServer.close).toHaveBeenCalled();
  });

  it('should handle errors during request handling', async () => {
    const error = new Error('Test error');
    mockTransport.handleRequest.mockRejectedValue(error);

    await startStreamableHttpServer(mockServer as unknown as McpServer);

    const postCall = mockApp.post.mock.calls[0];
    if (!postCall) {
      expect(mockApp.post).toHaveBeenCalled();
      return;
    }
    const handler = postCall[1];
    const req = { body: 'test-request' };
    const res = {
      on: vi.fn(),
      headersSent: false,
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: 'Internal server error',
      },
      id: null,
    });
  });

  it('should not send error response if headers are already sent', async () => {
    const error = new Error('Test error');
    mockTransport.handleRequest.mockRejectedValue(error);

    await startStreamableHttpServer(mockServer as unknown as McpServer);

    const postCall = mockApp.post.mock.calls[0];
    if (!postCall) {
      expect(mockApp.post).toHaveBeenCalled();
      return;
    }
    const handler = postCall[1];
    const req = { body: 'test-request' };
    const res = {
      on: vi.fn(),
      headersSent: true, // Simulate headers already sent
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    await handler(req, res);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});