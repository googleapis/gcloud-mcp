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
import { clouderrorreporting_v1beta1 } from 'googleapis';
import { listGroupStats } from './error_reporting_api_tools.js';
import { apiClientFactory } from '../../utils/api_client_factory.js';

const TEST_PROJECT_NAME = 'projects/my-project';

// Mock the ApiClientFactory
vi.mock('../../utils/api_client_factory.js', () => {
  const mockErrorReportingClient = {
    projects: {
      groupStats: {
        list: vi.fn(),
      },
    },
  };
  return {
    apiClientFactory: {
      getErrorReportingClient: () => mockErrorReportingClient,
    },
  };
});

const createMockListGroupStatsResponse = (
  stats: clouderrorreporting_v1beta1.Schema$ErrorGroupStats[],
): Partial<GaxiosResponse<clouderrorreporting_v1beta1.Schema$ListGroupStatsResponse>> => ({
  data: {
    errorGroupStats: stats,
  },
});

describe('listGroupStats', () => {
  it('should return a JSON string of group stats on success', async () => {
    const mockResponse = createMockListGroupStatsResponse([{ count: '10' }]);
    const errorReportingClient = apiClientFactory.getErrorReportingClient();
    (errorReportingClient.projects.groupStats.list as Mock).mockResolvedValue(mockResponse);

    const result = await listGroupStats(TEST_PROJECT_NAME);
    expect(JSON.parse(result)).toEqual(mockResponse.data!.errorGroupStats);
    expect(errorReportingClient.projects.groupStats.list).toHaveBeenCalledWith({
      projectName: TEST_PROJECT_NAME,
      'timeRange.period': undefined,
      order: undefined,
      pageSize: undefined,
      pageToken: undefined,
    });
  });

  it('should pass all parameters correctly to the API call', async () => {
    const mockResponse = createMockListGroupStatsResponse([]);
    const errorReportingClient = apiClientFactory.getErrorReportingClient();
    (errorReportingClient.projects.groupStats.list as Mock).mockResolvedValue(mockResponse);

    await listGroupStats(TEST_PROJECT_NAME, 'PERIOD_1_DAY', 'COUNT_DESC', 25, 'test-token');

    expect(errorReportingClient.projects.groupStats.list).toHaveBeenCalledWith({
      projectName: TEST_PROJECT_NAME,
      'timeRange.period': 'PERIOD_1_DAY',
      order: 'COUNT_DESC',
      pageSize: 25,
      pageToken: 'test-token',
    });
  });

  it('should return an empty array when no group stats are found', async () => {
    const mockResponse = createMockListGroupStatsResponse([]);
    const errorReportingClient = apiClientFactory.getErrorReportingClient();
    (errorReportingClient.projects.groupStats.list as Mock).mockResolvedValue(mockResponse);

    const result = await listGroupStats(TEST_PROJECT_NAME);
    expect(result).toBe('[]');
  });

  it('should throw an error if the API call fails', async () => {
    const errorMessage = 'API Error';
    const errorReportingClient = apiClientFactory.getErrorReportingClient();
    vi.mocked(errorReportingClient.projects.groupStats.list).mockRejectedValue(
      new Error(errorMessage),
    );

    await expect(listGroupStats(TEST_PROJECT_NAME)).rejects.toThrow(
      `Failed to list group stats: ${errorMessage}`,
    );
  });
});
