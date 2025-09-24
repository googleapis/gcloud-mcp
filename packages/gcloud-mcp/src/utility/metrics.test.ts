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
import { describe, test, expect } from 'vitest';
import { buildMcpMetric } from './metrics.js';

describe('buildMcpMetric', () => {
  test('should return the correctly formatted MCP metric string', () => {
    const mockMcpServer = {
      server: {
        _serverInfo: {
          name: 'test-server',
          version: '1.0.0',
        },
        getClientVersion: () => ({
          name: 'test-agent',
          version: '1.2.3',
        }),
      },
    } as unknown as McpServer;

    const toolName = 'test-tool';
    const expectedMetric = 'goog-mcp/test-agent/test-server/1.0.0/test-tool';
    const actualMetric = buildMcpMetric(mockMcpServer, toolName);

    expect(actualMetric).toBe(expectedMetric);
  });

  test('should handle missing server and client info', () => {
    const mockMcpServer = {
      server: {
        _serverInfo: {},
        getClientVersion: () => ({}),
      },
    } as unknown as McpServer;

    const toolName = 'test-tool';
    const expectedMetric = 'goog-mcp////test-tool';
    const actualMetric = buildMcpMetric(mockMcpServer, toolName);

    expect(actualMetric).toBe(expectedMetric);
  });
});
