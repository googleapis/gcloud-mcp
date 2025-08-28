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
import { monitoring_v3 } from 'googleapis';
import {
  listMetricDescriptors,
  listTimeSeries,
  listAlertPolicies,
} from './monitoring_api_tools.js';
import { apiClientFactory } from '../../utils/api_client_factory.js';

const TEST_PROJECT_ID = 'my-project';
const TEST_PROJECT_RESOURCE = `projects/${TEST_PROJECT_ID}`;

// Mock the ApiClientFactory
vi.mock('../../utils/api_client_factory.js', () => {
  const mockMonitoringClient = {
    projects: {
      metricDescriptors: {
        list: vi.fn(),
      },
      timeSeries: {
        list: vi.fn(),
      },
      alertPolicies: {
        list: vi.fn(),
      },
    },
  };
  return {
    apiClientFactory: {
      getMonitoringClient: () => mockMonitoringClient,
    },
  };
});

const createMockListMetricDescriptorsResponse = (
  descriptors: monitoring_v3.Schema$MetricDescriptor[],
): Partial<GaxiosResponse<monitoring_v3.Schema$ListMetricDescriptorsResponse>> => ({
  data: {
    metricDescriptors: descriptors,
  },
});

const createMockListTimeSeriesResponse = (
  series: monitoring_v3.Schema$TimeSeries[],
): Partial<GaxiosResponse<monitoring_v3.Schema$ListTimeSeriesResponse>> => ({
  data: {
    timeSeries: series,
  },
});

const createMockListAlertPoliciesResponse = (
  policies: monitoring_v3.Schema$AlertPolicy[],
): Partial<GaxiosResponse<monitoring_v3.Schema$ListAlertPoliciesResponse>> => ({
  data: {
    alertPolicies: policies,
  },
});

describe('listMetricDescriptors', () => {
  it('should return a JSON string of metric descriptors on success', async () => {
    const mockResponse = createMockListMetricDescriptorsResponse([{ name: 'test-descriptor' }]);
    const monitoringClient = apiClientFactory.getMonitoringClient();
    (monitoringClient.projects.metricDescriptors.list as Mock).mockResolvedValue(mockResponse);

    const result = await listMetricDescriptors(TEST_PROJECT_RESOURCE);
    expect(JSON.parse(result)).toEqual(mockResponse.data!.metricDescriptors);
    expect(monitoringClient.projects.metricDescriptors.list).toHaveBeenCalledWith({
      name: TEST_PROJECT_RESOURCE,
      filter: undefined,
      pageSize: undefined,
      pageToken: undefined,
    });
  });

  it('should pass all parameters correctly to the API call', async () => {
    const mockResponse = createMockListMetricDescriptorsResponse([]);
    const monitoringClient = apiClientFactory.getMonitoringClient();
    (monitoringClient.projects.metricDescriptors.list as Mock).mockResolvedValue(mockResponse);

    await listMetricDescriptors(TEST_PROJECT_RESOURCE, 'test-filter', 25, 'my-page-token');

    expect(monitoringClient.projects.metricDescriptors.list).toHaveBeenCalledWith({
      name: TEST_PROJECT_RESOURCE,
      filter: 'test-filter',
      pageSize: 25,
      pageToken: 'my-page-token',
    });
  });

  it('should return an empty array when no descriptors are found', async () => {
    const mockResponse = createMockListMetricDescriptorsResponse([]);
    const monitoringClient = apiClientFactory.getMonitoringClient();
    (monitoringClient.projects.metricDescriptors.list as Mock).mockResolvedValue(mockResponse);

    const result = await listMetricDescriptors(TEST_PROJECT_RESOURCE);
    expect(JSON.parse(result)).toEqual([]);
  });

  it('should throw an error if the API call fails', async () => {
    const errorMessage = 'API Error';
    const monitoringClient = apiClientFactory.getMonitoringClient();
    (monitoringClient.projects.metricDescriptors.list as Mock).mockRejectedValue(
      new Error(errorMessage),
    );

    await expect(listMetricDescriptors(TEST_PROJECT_RESOURCE)).rejects.toThrow(
      `Failed to list metric descriptors: ${errorMessage}`,
    );
  });
});

describe('listTimeSeries', () => {
  const startTime = new Date(0).toISOString();
  const endTime = new Date().toISOString();
  it('should return a JSON string of time series on success', async () => {
    const mockResponse = createMockListTimeSeriesResponse([{ valueType: 'INT64' }]);
    const monitoringClient = apiClientFactory.getMonitoringClient();
    (monitoringClient.projects.timeSeries.list as Mock).mockResolvedValue(mockResponse);

    const result = await listTimeSeries(TEST_PROJECT_RESOURCE, 'test-filter', {
      endTime,
    });
    expect(JSON.parse(result)).toEqual(mockResponse.data!.timeSeries);
  });

  it('should pass all parameters correctly to the API call', async () => {
    const mockResponse = createMockListTimeSeriesResponse([]);
    const monitoringClient = apiClientFactory.getMonitoringClient();
    (monitoringClient.projects.timeSeries.list as Mock).mockResolvedValue(mockResponse);

    await listTimeSeries(
      TEST_PROJECT_RESOURCE,
      'test-filter',
      {
        startTime,
        endTime,
      },
      {
        alignmentPeriod: '120s',
        perSeriesAligner: 'ALIGN_SUM',
      },
      10,
      'my-page-token',
    );

    expect(monitoringClient.projects.timeSeries.list).toHaveBeenCalledWith({
      name: TEST_PROJECT_RESOURCE,
      filter: 'test-filter',
      'interval.startTime': startTime,
      'interval.endTime': endTime,
      'aggregation.alignmentPeriod': '120s',
      'aggregation.perSeriesAligner': 'ALIGN_SUM',
      pageSize: 10,
      pageToken: 'my-page-token',
    });
  });

  it('should return an empty array when no time series are found', async () => {
    const mockResponse = createMockListTimeSeriesResponse([]);
    const monitoringClient = apiClientFactory.getMonitoringClient();
    (monitoringClient.projects.timeSeries.list as Mock).mockResolvedValue(mockResponse);

    const result = await listTimeSeries(TEST_PROJECT_RESOURCE, 'test-filter', {
      endTime,
    });
    expect(JSON.parse(result)).toEqual([]);
  });

  it('should throw an error if the API call fails', async () => {
    const errorMessage = 'API Error';
    const monitoringClient = apiClientFactory.getMonitoringClient();
    (monitoringClient.projects.timeSeries.list as Mock).mockRejectedValue(new Error(errorMessage));

    await expect(listTimeSeries(TEST_PROJECT_RESOURCE, 'test-filter', { endTime })).rejects.toThrow(
      `Failed to list time series: ${errorMessage}`,
    );
  });
});

describe('listAlertPolicies', () => {
  it('should return a JSON string of alert policies on success', async () => {
    const mockResponse = createMockListAlertPoliciesResponse([{ name: 'test-policy' }]);
    const monitoringClient = apiClientFactory.getMonitoringClient();
    (monitoringClient.projects.alertPolicies.list as Mock).mockResolvedValue(mockResponse);

    const result = await listAlertPolicies(TEST_PROJECT_RESOURCE);
    expect(JSON.parse(result)).toEqual(mockResponse.data!.alertPolicies);
    expect(monitoringClient.projects.alertPolicies.list).toHaveBeenCalledWith({
      name: TEST_PROJECT_RESOURCE,
      filter: undefined,
      orderBy: undefined,
      pageSize: undefined,
      pageToken: undefined,
    });
  });

  it('should pass all parameters correctly to the API call', async () => {
    const mockResponse = createMockListAlertPoliciesResponse([]);
    const monitoringClient = apiClientFactory.getMonitoringClient();
    (monitoringClient.projects.alertPolicies.list as Mock).mockResolvedValue(mockResponse);

    await listAlertPolicies(
      TEST_PROJECT_RESOURCE,
      'test-filter',
      'displayName',
      25,
      'my-page-token',
    );

    expect(monitoringClient.projects.alertPolicies.list).toHaveBeenCalledWith({
      name: TEST_PROJECT_RESOURCE,
      filter: 'test-filter',
      orderBy: 'displayName',
      pageSize: 25,
      pageToken: 'my-page-token',
    });
  });

  it('should return an empty array when no policies are found', async () => {
    const mockResponse = createMockListAlertPoliciesResponse([]);
    const monitoringClient = apiClientFactory.getMonitoringClient();
    (monitoringClient.projects.alertPolicies.list as Mock).mockResolvedValue(mockResponse);

    const result = await listAlertPolicies(TEST_PROJECT_RESOURCE);
    expect(JSON.parse(result)).toEqual([]);
  });

  it('should throw an error if the API call fails', async () => {
    const errorMessage = 'API Error';
    const monitoringClient = apiClientFactory.getMonitoringClient();
    (monitoringClient.projects.alertPolicies.list as Mock).mockRejectedValue(
      new Error(errorMessage),
    );

    await expect(listAlertPolicies(TEST_PROJECT_RESOURCE)).rejects.toThrow(
      `Failed to list alert policies: ${errorMessage}`,
    );
  });
});
