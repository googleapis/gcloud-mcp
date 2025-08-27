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

import { describe, it, expect, vi, Mock } from 'vitest';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerTools } from './registration.js';
import * as tools from './index.js';

// Mock the underlying tool functions
vi.mock('./index.js', () => ({
  listGroupStats: vi.fn(),
  listLogEntries: vi.fn(),
  listBuckets: vi.fn(),
  listViews: vi.fn(),
  listSinks: vi.fn(),
  listLogScopes: vi.fn(),
  listMetricDescriptors: vi.fn(),
  listTimeSeries: vi.fn(),
  listAlertPolicies: vi.fn(),
  listTraces: vi.fn(),
  getTrace: vi.fn(),
}));

// Mock the toolWrapper
vi.mock('../utils/index.js', () => ({
  toolWrapper: vi.fn((fn) => fn),
}));

describe('registerTools', () => {
  it('should register all available tools with the McpServer', () => {
    const mockServer = {
      tool: vi.fn(),
    } as unknown as McpServer;

    registerTools(mockServer);

    // Check that server.tool was called for each tool
    const expectedToolCount = Object.keys(tools).length;
    expect(mockServer.tool).toHaveBeenCalledTimes(expectedToolCount);

    // Spot-check a specific tool registration (e.g., list_log_entries)
    const listLogEntriesCall = (mockServer.tool as Mock).mock.calls.find(
      (call: unknown[]) => call[0] === 'list_log_entries'
    );

    expect(listLogEntriesCall).toBeDefined();
    if (listLogEntriesCall) {
      expect(listLogEntriesCall[0]).toBe('list_log_entries');
      expect(typeof listLogEntriesCall[1]).toBe('string'); // Description
      expect(listLogEntriesCall[2]).toBeTypeOf('object'); // Zod schema
      expect(typeof listLogEntriesCall[3]).toBe('function'); // Handler
    }
  });

  it('should create a valid Zod schema for each tool', () => {
    const mockServer = {
      tool: vi.fn(),
    } as unknown as McpServer;

    registerTools(mockServer);

    const calls = (mockServer.tool as Mock).mock.calls;
    expect(calls.length).toBeGreaterThan(0);

    // Check that each registered tool has a schema that can be parsed by Zod
    calls.forEach((call: unknown[]) => {
      const schemaDefinition = call[2];
      expect(schemaDefinition).toBeDefined();
      // The McpServer likely does this internally. We're testing that the provided
      // schema definition is valid for this operation.
      const zodSchema = z.object(schemaDefinition as z.ZodRawShape);
      expect(typeof zodSchema.parse).toBe('function');
    });
  });
});
