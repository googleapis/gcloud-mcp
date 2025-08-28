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
import { GaxiosResponse } from 'gaxios';
import { cloudtrace_v1 } from 'googleapis';
import { listTraces, getTrace } from './trace_api_tools.js';
import { apiClientFactory } from '../../utils/api_client_factory.js';

const TEST_PROJECT_ID = 'my-project';

// Mock the ApiClientFactory
vi.mock('../../utils/api_client_factory.js', () => {
  const mockTraceClient = {
    projects: {
      traces: {
        list: vi.fn(),
        get: vi.fn(),
      },
    },
  };
  return {
    apiClientFactory: {
      getTraceClient: () => mockTraceClient,
    },
  };
});

const createMockListTracesResponse = (
  traces: cloudtrace_v1.Schema$Trace[],
): Partial<GaxiosResponse<cloudtrace_v1.Schema$ListTracesResponse>> => ({
  data: {
    traces,
  },
});

describe('listTraces', () => {
  it('should return a JSON string of traces on success', async () => {
    const mockResponse = createMockListTracesResponse([{ traceId: 'test-trace' }]);
    const traceClient = apiClientFactory.getTraceClient();
    (traceClient.projects.traces.list as Mock).mockResolvedValue(mockResponse);

    const result = await listTraces(TEST_PROJECT_ID);
    expect(JSON.parse(result)).toEqual(mockResponse.data!.traces);
    expect(traceClient.projects.traces.list).toHaveBeenCalledWith({
      projectId: TEST_PROJECT_ID,
      filter: undefined,
      orderBy: undefined,
      pageSize: undefined,
      pageToken: undefined,
      startTime: undefined,
      endTime: undefined,
      view: 'ROOTSPAN',
    });
  });

  it('should pass all parameters correctly to the API call', async () => {
    const mockResponse = createMockListTracesResponse([]);
    const traceClient = apiClientFactory.getTraceClient();
    (traceClient.projects.traces.list as Mock).mockResolvedValue(mockResponse);
    const startTime = new Date(0).toISOString();
    const endTime = new Date().toISOString();

    await listTraces(
      TEST_PROJECT_ID,
      'test-filter',
      'name desc',
      25,
      'my-page-token',
      startTime,
      endTime,
    );

    expect(traceClient.projects.traces.list).toHaveBeenCalledWith({
      projectId: TEST_PROJECT_ID,
      filter: 'test-filter',
      orderBy: 'name desc',
      pageSize: 25,
      pageToken: 'my-page-token',
      startTime,
      endTime,
      view: 'ROOTSPAN',
    });
  });

  it('should return an empty array when no traces are found', async () => {
    const mockResponse = createMockListTracesResponse([]);
    const traceClient = apiClientFactory.getTraceClient();
    (traceClient.projects.traces.list as Mock).mockResolvedValue(mockResponse);

    const result = await listTraces(TEST_PROJECT_ID);
    expect(JSON.parse(result)).toEqual([]);
  });

  it('should throw an error if the API call fails', async () => {
    const errorMessage = 'API Error';
    const traceClient = apiClientFactory.getTraceClient();
    (traceClient.projects.traces.list as Mock).mockRejectedValue(new Error(errorMessage));

    await expect(listTraces(TEST_PROJECT_ID)).rejects.toThrow(
      `Failed to list traces: ${errorMessage}`,
    );
  });
});

describe('getTrace', () => {
  it('should return a JSON string of a trace on success', async () => {
    const mockResponse = {
      data: { traceId: 'test-trace' },
    };
    const traceClient = apiClientFactory.getTraceClient();
    (traceClient.projects.traces.get as Mock).mockResolvedValue(mockResponse);

    const result = await getTrace(TEST_PROJECT_ID, 'test-trace');
    expect(JSON.parse(result)).toEqual(mockResponse.data);
    expect(traceClient.projects.traces.get).toHaveBeenCalledWith({
      projectId: TEST_PROJECT_ID,
      traceId: 'test-trace',
    });
  });

  it('should throw an error if the API call fails', async () => {
    const errorMessage = 'API Error';
    const traceClient = apiClientFactory.getTraceClient();
    (traceClient.projects.traces.get as Mock).mockRejectedValue(new Error(errorMessage));

    await expect(getTrace(TEST_PROJECT_ID, 'test-trace')).rejects.toThrow(
      `Failed to get trace: ${errorMessage}`,
    );
  });
});
