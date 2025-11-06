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
  const MOCK_QUERY = 'SELECT * FROM my-table';
  const DEFAULT_JOB_TIMEOUT_MS = 10000;

  const TEST_PROJECT_ID = 'test-project';
  const TEST_LOCATION = 'us-central1';
  const TEST_CONFIG_ID = 'test-config';
  const TEST_DATASET_ID = 'test-dataset';

  const MOCK_CONFIG_NAME = `projects/${TEST_PROJECT_ID}/locations/${TEST_LOCATION}/datasetConfigs/${TEST_CONFIG_ID}`;
  const MOCK_LINKED_DATASET = `projects/${TEST_PROJECT_ID}/datasets/${TEST_DATASET_ID}`;

  const mockFullConfig = JSON.stringify({
    name: MOCK_CONFIG_NAME,
    link: { dataset: MOCK_LINKED_DATASET },
  });

  const mockSimplifiedConfig = JSON.stringify({
    name: MOCK_CONFIG_NAME,
  });

  const MOCK_DEFAULT_ROWS = [{ id: 1, name: 'default' }];
  const MOCK_TEST_ROWS = [{ id: 1, name: 'test' }];

  const mockDryRunJob = { id: 'dry-run-123' };
  const mockActualJob = { id: 'job-123', getQueryResults: vi.fn() };
  const mockDataset = { createQueryJob: vi.fn() };
  const mockBigQuery = { dataset: vi.fn().mockReturnValue(mockDataset) };

  beforeEach(() => {
    vi.clearAllMocks();
    (BigQuery as vi.Mock).mockReturnValue(mockBigQuery);
    mockDataset.createQueryJob.mockImplementation((options) => {
      if (options.dryRun) {
        return Promise.resolve([mockDryRunJob]);
      } else {
        return Promise.resolve([mockActualJob]);
      }
    });
    mockActualJob.getQueryResults.mockResolvedValue([MOCK_DEFAULT_ROWS]);
  });

  it('should execute a query with full config and return the results', async () => {
    mockActualJob.getQueryResults.mockResolvedValue([MOCK_TEST_ROWS]);

    const result = await executeInsightsQuery({
      config: mockFullConfig,
      query: MOCK_QUERY,
      jobTimeoutMs: DEFAULT_JOB_TIMEOUT_MS,
    });

    expect(mockBigQuery.dataset).toHaveBeenCalledWith(TEST_DATASET_ID, {
      projectId: TEST_PROJECT_ID,
    });
    expect(mockDataset.createQueryJob).toHaveBeenCalledTimes(2);
    expect(mockDataset.createQueryJob).toHaveBeenCalledWith({
      query: MOCK_QUERY,
      jobTimeoutMs: DEFAULT_JOB_TIMEOUT_MS,
      dryRun: true,
      location: TEST_LOCATION,
    });
    expect(mockDataset.createQueryJob).toHaveBeenCalledWith({
      query: MOCK_QUERY,
      jobTimeoutMs: DEFAULT_JOB_TIMEOUT_MS,
      location: TEST_LOCATION,
    });
    expect(mockActualJob.getQueryResults).toHaveBeenCalled();
    expect(result.content[0].text).toEqual(JSON.stringify(MOCK_TEST_ROWS));
  });

  it('should return an error if the actual query execution fails after dry run success', async () => {
    const mockError = new Error('Execution failed after dry run');
    mockActualJob.getQueryResults.mockRejectedValue(mockError);

    const result = await executeInsightsQuery({
      config: mockFullConfig,
      query: MOCK_QUERY,
      jobTimeoutMs: DEFAULT_JOB_TIMEOUT_MS,
    });

    expect(mockDataset.createQueryJob).toHaveBeenCalledTimes(2);
    expect(mockActualJob.getQueryResults).toHaveBeenCalledTimes(1);
    const content = JSON.parse(result.content[0].text);
    expect(content.error).toBe('Failed to execute insights query');
    expect(content.error_type).toBe('Unknown');
    expect(content.details).toContain('Execution failed after dry run');
  });

  it('should return a timeout error if the actual query times out', async () => {
    const mockError = new Error('Job timed out');
    mockDataset.createQueryJob
      .mockImplementationOnce((options) => {
        expect(options.dryRun).toBe(true);
        return Promise.resolve([mockDryRunJob]);
      })
      .mockImplementationOnce((options) => {
        expect(options.dryRun).toBeUndefined();
        return Promise.reject(mockError);
      });

    const result = await executeInsightsQuery({
      config: mockFullConfig,
      query: MOCK_QUERY,
      jobTimeoutMs: DEFAULT_JOB_TIMEOUT_MS,
    });

    expect(mockDataset.createQueryJob).toHaveBeenCalledTimes(2);
    const content = JSON.parse(result.content[0].text);
    expect(content.error).toBe('Failed to execute insights query');
    expect(content.error_type).toBe('Timeout');
    expect(content.details).toContain('Job timed out');
  });

  it('should return a validation error if the dry run fails due to invalid SQL', async () => {
    const badQuery = 'SELECT FRO my-table';
    const dryRunError = new Error('Syntax error: Unexpected token FRO');

    mockDataset.createQueryJob.mockImplementationOnce((options) => {
      expect(options.dryRun).toBe(true);
      return Promise.reject(dryRunError);
    });

    const result = await executeInsightsQuery({
      config: mockFullConfig,
      query: badQuery,
      jobTimeoutMs: DEFAULT_JOB_TIMEOUT_MS,
    });

    expect(mockDataset.createQueryJob).toHaveBeenCalledTimes(1);
    expect(mockDataset.createQueryJob).toHaveBeenCalledWith(
      expect.objectContaining({
        query: badQuery,
        dryRun: true,
        location: TEST_LOCATION,
      }),
    );
    const content = JSON.parse(result.content[0].text);
    expect(content.error).toBe(
      'Validation failed: Invalid BigQuery SQL or access error during dry run',
    );
    expect(content.error_type).toBe('QueryValidationError');
    expect(content.details).toBe('Syntax error: Unexpected token FRO');
  });

  it('should return a validation error if the dry run fails due to permission issues', async () => {
    const permissionError = new Error(
      'Access Denied: User does not have bigquery.jobs.create permission',
    );

    mockDataset.createQueryJob.mockImplementationOnce((options) => {
      expect(options.dryRun).toBe(true);
      return Promise.reject(permissionError);
    });

    const result = await executeInsightsQuery({
      config: mockFullConfig,
      query: MOCK_QUERY,
      jobTimeoutMs: DEFAULT_JOB_TIMEOUT_MS,
    });

    expect(mockDataset.createQueryJob).toHaveBeenCalledTimes(1);
    const content = JSON.parse(result.content[0].text);
    expect(content.error).toBe(
      'Validation failed: Invalid BigQuery SQL or access error during dry run',
    );
    expect(content.error_type).toBe('QueryValidationError');
    expect(content.details).toBe(
      'Access Denied: User does not have bigquery.jobs.create permission',
    );
  });

  it('should return an error if the config is missing the link property', async () => {
    const result = await executeInsightsQuery({
      config: mockSimplifiedConfig,
      query: MOCK_QUERY,
      jobTimeoutMs: DEFAULT_JOB_TIMEOUT_MS,
    });

    expect(result.content[0].text).toContain('Failed to execute insights query');
    expect(result.content[0].text).toContain(
      'The provided configuration is missing the `link.dataset` property.',
    );
    expect(mockDataset.createQueryJob).not.toHaveBeenCalled();
  });

  it('should return an error if the config is not a valid JSON object', async () => {
    const result = await executeInsightsQuery({
      config: 'not a json object',
      query: MOCK_QUERY,
      jobTimeoutMs: DEFAULT_JOB_TIMEOUT_MS,
    });

    expect(result.content[0].text).toContain('Failed to execute insights query');
    expect(result.content[0].text).toContain(
      'Invalid configuration provided. Expected a JSON object or a JSON string.',
    );
    expect(mockDataset.createQueryJob).not.toHaveBeenCalled();
  });

  it('should return an error if the parsed config is null', async () => {
    const result = await executeInsightsQuery({
      config: 'null',
      query: 'SELECT 1',
      jobTimeoutMs: DEFAULT_JOB_TIMEOUT_MS,
    });

    expect(result.content[0].text).toContain('Failed to execute insights query');
    expect(result.content[0].text).toContain(
      'Invalid configuration provided. Expected a JSON object.',
    );
    expect(mockDataset.createQueryJob).not.toHaveBeenCalled();
  });

  it('should return an error if the parsed config is a primitive type', async () => {
    const result = await executeInsightsQuery({
      config: '123',
      query: 'SELECT 1',
      jobTimeoutMs: DEFAULT_JOB_TIMEOUT_MS,
    });

    expect(result.content[0].text).toContain('Failed to execute insights query');
    expect(result.content[0].text).toContain(
      'Invalid configuration provided. Expected a JSON object.',
    );
    expect(mockDataset.createQueryJob).not.toHaveBeenCalled();
  });

  it('should return an error if the config has an invalid name format', async () => {
    const invalidConfig = JSON.stringify({
      name: 'invalid-name',
      link: { dataset: MOCK_LINKED_DATASET },
    });

    const result = await executeInsightsQuery({
      config: invalidConfig,
      query: MOCK_QUERY,
      jobTimeoutMs: DEFAULT_JOB_TIMEOUT_MS,
    });

    expect(result.content[0].text).toContain('Failed to execute insights query');
    expect(result.content[0].text).toContain('Invalid configuration name format');
    expect(mockDataset.createQueryJob).not.toHaveBeenCalled();
  });

  it('should return an error if datasetId is empty after extraction', async () => {
    const configWithEmptyDatasetId = JSON.stringify({
      name: MOCK_CONFIG_NAME,
      link: { dataset: `projects/${TEST_PROJECT_ID}/datasets/` },
    });

    const result = await executeInsightsQuery({
      config: configWithEmptyDatasetId,
      query: MOCK_QUERY,
      jobTimeoutMs: DEFAULT_JOB_TIMEOUT_MS,
    });

    expect(result.content[0].text).toContain('Failed to execute insights query');
    expect(result.content[0].text).toContain(
      'Could not extract datasetId from the linked dataset.',
    );
    expect(mockBigQuery.dataset).not.toHaveBeenCalled();
    expect(mockDataset.createQueryJob).not.toHaveBeenCalled();
  });

  it('should return an error if the location segment is empty in the config name', async () => {
    const configWithEmptyLocation = JSON.stringify({
      name: 'projects/test-project/locations//datasetConfigs/test-config',
      link: { dataset: MOCK_LINKED_DATASET },
    });

    const result = await executeInsightsQuery({
      config: configWithEmptyLocation,
      query: MOCK_QUERY,
      jobTimeoutMs: DEFAULT_JOB_TIMEOUT_MS,
    });

    const content = JSON.parse(result.content[0].text);
    expect(content.error).toBe('Failed to execute insights query');
    expect(content.details).toBe('Could not extract location from the configuration name.');
    expect(mockDataset.createQueryJob).not.toHaveBeenCalled();
  });

  it('should pass the location to the BigQuery client', async () => {
    const mockQuery = 'SELECT * FROM my-table';
    const mockRows = [{ id: 1, name: 'test' }];
    mockActualJob.getQueryResults.mockResolvedValue([mockRows]);

    await executeInsightsQuery({
      config: mockFullConfig,
      query: mockQuery,
      jobTimeoutMs: 10000,
    });

    expect(mockBigQuery.dataset).toHaveBeenCalledWith('test-dataset', {
      projectId: 'test-project',
    });
    expect(mockDataset.createQueryJob).toHaveBeenCalledWith({
      query: mockQuery,
      jobTimeoutMs: 10000,
      location: 'us-central1',
    });
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
