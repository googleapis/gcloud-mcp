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

import { BigQuery } from '@google-cloud/bigquery';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import {
  executeInsightsQuery,
  registerExecuteInsightsQueryTool,
} from './execute_insights_query.js';

vi.mock('@google-cloud/bigquery');

describe('executeInsightsQuery', () => {
  const mockConfig = JSON.stringify({
    link: { dataset: 'projects/test-project/datasets/test-dataset' },
  });

  const mockJob = { id: 'job-123', getQueryResults: vi.fn() };
  const mockDataset = { createQueryJob: vi.fn().mockResolvedValue([mockJob]) };
  const mockBigQuery = { dataset: vi.fn().mockReturnValue(mockDataset) };

  beforeEach(() => {
    vi.clearAllMocks();
    (BigQuery as vi.Mock).mockReturnValue(mockBigQuery);
  });

  it('should execute a query and return the results', async () => {
    const mockQuery = 'SELECT * FROM my-table';
    const mockRows = [{ id: 1, name: 'test' }];
    mockJob.getQueryResults.mockResolvedValue([mockRows]);

    const result = await executeInsightsQuery({
      config: mockConfig,
      query: mockQuery,
      jobTimeoutMs: 10000,
    });

    expect(mockBigQuery.dataset).toHaveBeenCalledWith('test-dataset', {
      projectId: 'test-project',
    });
    expect(mockDataset.createQueryJob).toHaveBeenCalledWith({
      query: mockQuery,
      jobTimeoutMs: 10000,
    });
    expect(mockJob.getQueryResults).toHaveBeenCalled();
    expect(result.content[0].text).toEqual(JSON.stringify(mockRows));
  });

  it('should return an error if the query fails', async () => {
    const mockQuery = 'SELECT * FROM my-table';
    const mockError = new Error('Invalid query');
    mockJob.getQueryResults.mockRejectedValue(mockError);

    const result = await executeInsightsQuery({
      config: mockConfig,
      query: mockQuery,
      jobTimeoutMs: 10000,
    });

    expect(result.content[0].text).toContain('Failed to execute insights query');
    expect(result.content[0].text).toContain('Invalid query');
  });

  it('should return a timeout error if the query times out', async () => {
    const mockQuery = 'SELECT * FROM my-table';
    const mockError = new Error('Job timed out');
    mockDataset.createQueryJob.mockRejectedValue(mockError);

    const result = await executeInsightsQuery({
      config: mockConfig,
      query: mockQuery,
      jobTimeoutMs: 10000,
    });

    expect(result.content[0].text).toContain('Failed to execute insights query');
    expect(result.content[0].text).toContain('Timeout');
  });

  it('should return an error if the config is invalid', async () => {
    const result = await executeInsightsQuery({
      config: '{}',
      query: 'SELECT * FROM my-table',
      jobTimeoutMs: 10000,
    });

    expect(result.content[0].text).toContain('Failed to execute insights query');
    expect(result.content[0].text).toContain('Configuration does not have a linked dataset');
  });
});

describe('registerExecuteInsightsQueryTool', () => {
  it('should register the tool with the server', () => {
    const mockServer = { registerTool: vi.fn() } as unknown as McpServer;
    registerExecuteInsightsQueryTool(mockServer);
    expect(mockServer.registerTool).toHaveBeenCalledWith(
      'execute_insights_query',
      expect.any(Object),
      executeInsightsQuery,
    );
  });
});
