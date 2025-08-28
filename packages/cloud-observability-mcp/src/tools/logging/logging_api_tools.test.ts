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
import { logging_v2 } from 'googleapis';
import {
  listLogEntries,
  listBuckets,
  listViews,
  listSinks,
  listLogScopes,
  listLogNames,
} from './logging_api_tools.js';
import { apiClientFactory } from '../../utils/api_client_factory.js';

const TEST_PROJECT_ID = 'my-project';
const TEST_PROJECT_RESOURCE = `projects/${TEST_PROJECT_ID}`;
const TEST_BUCKET_ID = 'my-bucket';
const TEST_LOCATION = 'us-central1';

// Mock the ApiClientFactory
vi.mock('../../utils/api_client_factory.js', () => {
  const mockLoggingClient = {
    entries: {
      list: vi.fn(),
    },
    projects: {
      locations: {
        buckets: {
          list: vi.fn(),
          views: {
            list: vi.fn(),
          },
        },
        logScopes: {
          list: vi.fn(),
        },
      },
      sinks: {
        list: vi.fn(),
      },
      logs: {
        list: vi.fn(),
      },
    },
  };
  return {
    apiClientFactory: {
      getLoggingClient: () => mockLoggingClient,
    },
  };
});

const createMockListLogEntriesResponse = (
  entries: logging_v2.Schema$LogEntry[],
): Partial<GaxiosResponse<logging_v2.Schema$ListLogEntriesResponse>> => ({
  data: {
    entries,
  },
});

const createMockListBucketsResponse = (
  buckets: logging_v2.Schema$LogBucket[],
): Partial<GaxiosResponse<logging_v2.Schema$ListBucketsResponse>> => ({
  data: {
    buckets,
  },
});

const createMockListViewsResponse = (
  views: logging_v2.Schema$LogView[],
): Partial<GaxiosResponse<logging_v2.Schema$ListViewsResponse>> => ({
  data: {
    views,
  },
});

const createMockListSinksResponse = (
  sinks: logging_v2.Schema$LogSink[],
): Partial<GaxiosResponse<logging_v2.Schema$ListSinksResponse>> => ({
  data: {
    sinks,
  },
});

const createMockListLogScopesResponse = (
  logScopes: logging_v2.Schema$LogScope[],
): Partial<GaxiosResponse<logging_v2.Schema$ListLogScopesResponse>> => ({
  data: {
    logScopes,
  },
});

const createMockListLogNamesResponse = (
  logNames: string[],
): Partial<GaxiosResponse<logging_v2.Schema$ListLogsResponse>> => ({
  data: {
    logNames,
  },
});

describe('listLogEntries', () => {
  it('should return a JSON string of log entries on success', async () => {
    const mockResponse = createMockListLogEntriesResponse([{ textPayload: 'test log entry' }]);
    const loggingClient = apiClientFactory.getLoggingClient();
    (loggingClient.entries.list as Mock).mockResolvedValue(mockResponse);

    const result = await listLogEntries([TEST_PROJECT_RESOURCE], 'test filter');
    expect(JSON.parse(result)).toEqual(mockResponse.data!.entries);
    expect(loggingClient.entries.list).toHaveBeenCalledWith({
      requestBody: {
        resourceNames: [TEST_PROJECT_RESOURCE],
        filter: 'test filter',
        pageSize: 50,
        orderBy: 'timestamp asc',
        pageToken: undefined,
      },
    });
  });

  it('should return an empty array when no entries are found', async () => {
    const mockResponse = createMockListLogEntriesResponse([]);
    const loggingClient = apiClientFactory.getLoggingClient();
    (loggingClient.entries.list as Mock).mockResolvedValue(mockResponse);

    const result = await listLogEntries([TEST_PROJECT_RESOURCE], 'test filter');
    expect(JSON.parse(result)).toEqual([]);
  });

  it('should pass all parameters correctly to the API call', async () => {
    const mockResponse = createMockListLogEntriesResponse([]);
    const loggingClient = apiClientFactory.getLoggingClient();
    (loggingClient.entries.list as Mock).mockResolvedValue(mockResponse);

    await listLogEntries(
      ['projects/p1', 'folders/f1'],
      'severity=ERROR',
      'timestamp desc',
      25,
      'my-page-token',
    );

    expect(loggingClient.entries.list).toHaveBeenCalledWith({
      requestBody: {
        resourceNames: ['projects/p1', 'folders/f1'],
        filter: 'severity=ERROR',
        orderBy: 'timestamp desc',
        pageSize: 25,
        pageToken: 'my-page-token',
      },
    });
  });

  it('should throw an error if the API call fails', async () => {
    const errorMessage = 'API Error';
    const loggingClient = apiClientFactory.getLoggingClient();
    (loggingClient.entries.list as Mock).mockRejectedValue(new Error(errorMessage));

    await expect(listLogEntries([TEST_PROJECT_RESOURCE], 'test filter')).rejects.toThrow(
      `Failed to list log entries: ${errorMessage}`,
    );
  });
});

describe('listBuckets', () => {
  it('should return a JSON string of log buckets on success', async () => {
    const mockResponse = createMockListBucketsResponse([{ name: 'test-bucket' }]);
    const loggingClient = apiClientFactory.getLoggingClient();
    (loggingClient.projects.locations.buckets.list as Mock).mockResolvedValue(mockResponse);

    const result = await listBuckets(`${TEST_PROJECT_RESOURCE}/locations/global`);
    expect(JSON.parse(result)).toEqual(mockResponse.data!.buckets);
    expect(loggingClient.projects.locations.buckets.list).toHaveBeenCalledWith({
      parent: `${TEST_PROJECT_RESOURCE}/locations/global`,
    });
  });

  it('should pass location parameter correctly', async () => {
    const mockResponse = createMockListBucketsResponse([]);
    const loggingClient = apiClientFactory.getLoggingClient();
    (loggingClient.projects.locations.buckets.list as Mock).mockResolvedValue(mockResponse);

    await listBuckets(`${TEST_PROJECT_RESOURCE}/locations/${TEST_LOCATION}`);
    expect(loggingClient.projects.locations.buckets.list).toHaveBeenCalledWith({
      parent: `${TEST_PROJECT_RESOURCE}/locations/${TEST_LOCATION}`,
    });
  });

  it('should return an empty array when no buckets are found', async () => {
    const mockResponse = createMockListBucketsResponse([]);
    const loggingClient = apiClientFactory.getLoggingClient();
    (loggingClient.projects.locations.buckets.list as Mock).mockResolvedValue(mockResponse);

    const result = await listBuckets(`${TEST_PROJECT_RESOURCE}/locations/global`);
    expect(JSON.parse(result)).toEqual([]);
  });

  it('should throw an error if the API call fails', async () => {
    const errorMessage = 'API Error';
    const loggingClient = apiClientFactory.getLoggingClient();
    (loggingClient.projects.locations.buckets.list as Mock).mockRejectedValue(
      new Error(errorMessage),
    );

    await expect(listBuckets(`${TEST_PROJECT_RESOURCE}/locations/global`)).rejects.toThrow(
      `Failed to list log buckets: ${errorMessage}`,
    );
  });
});

describe('listViews', () => {
  it('should return a JSON string of log views on success', async () => {
    const mockResponse = createMockListViewsResponse([{ name: 'test-view' }]);
    const loggingClient = apiClientFactory.getLoggingClient();
    (loggingClient.projects.locations.buckets.views.list as Mock).mockResolvedValue(mockResponse);

    const result = await listViews(
      `${TEST_PROJECT_RESOURCE}/locations/global/buckets/${TEST_BUCKET_ID}`,
    );
    expect(JSON.parse(result)).toEqual(mockResponse.data!.views);
    expect(loggingClient.projects.locations.buckets.views.list).toHaveBeenCalledWith({
      parent: `${TEST_PROJECT_RESOURCE}/locations/global/buckets/${TEST_BUCKET_ID}`,
    });
  });

  it('should pass location parameter correctly', async () => {
    const mockResponse = createMockListViewsResponse([]);
    const loggingClient = apiClientFactory.getLoggingClient();
    (loggingClient.projects.locations.buckets.views.list as Mock).mockResolvedValue(mockResponse);

    await listViews(
      `${TEST_PROJECT_RESOURCE}/locations/${TEST_LOCATION}/buckets/${TEST_BUCKET_ID}`,
    );
    expect(loggingClient.projects.locations.buckets.views.list).toHaveBeenCalledWith({
      parent: `${TEST_PROJECT_RESOURCE}/locations/${TEST_LOCATION}/buckets/${TEST_BUCKET_ID}`,
    });
  });

  it('should return an empty array when no views are found', async () => {
    const mockResponse = createMockListViewsResponse([]);
    const loggingClient = apiClientFactory.getLoggingClient();
    (loggingClient.projects.locations.buckets.views.list as Mock).mockResolvedValue(mockResponse);

    const result = await listViews(
      `${TEST_PROJECT_RESOURCE}/locations/global/buckets/${TEST_BUCKET_ID}`,
    );
    expect(JSON.parse(result)).toEqual([]);
  });

  it('should throw an error if the API call fails', async () => {
    const errorMessage = 'API Error';
    const loggingClient = apiClientFactory.getLoggingClient();
    (loggingClient.projects.locations.buckets.views.list as Mock).mockRejectedValue(
      new Error(errorMessage),
    );

    await expect(
      listViews(`${TEST_PROJECT_RESOURCE}/locations/global/buckets/${TEST_BUCKET_ID}`),
    ).rejects.toThrow(`Failed to list log views: ${errorMessage}`);
  });
});

describe('listSinks', () => {
  it('should return a JSON string of log sinks on success', async () => {
    const mockResponse = createMockListSinksResponse([{ name: 'test-sink' }]);
    const loggingClient = apiClientFactory.getLoggingClient();
    (loggingClient.projects.sinks.list as Mock).mockResolvedValue(mockResponse);

    const result = await listSinks(TEST_PROJECT_RESOURCE);
    expect(JSON.parse(result)).toEqual(mockResponse.data!.sinks);
    expect(loggingClient.projects.sinks.list).toHaveBeenCalledWith({
      parent: TEST_PROJECT_RESOURCE,
      pageSize: undefined,
      pageToken: undefined,
    });
  });

  it('should pass all parameters correctly to the API call', async () => {
    const mockResponse = createMockListSinksResponse([]);
    const loggingClient = apiClientFactory.getLoggingClient();
    (loggingClient.projects.sinks.list as Mock).mockResolvedValue(mockResponse);

    await listSinks('folders/f1', 25, 'my-page-token');

    expect(loggingClient.projects.sinks.list).toHaveBeenCalledWith({
      parent: 'folders/f1',
      pageSize: 25,
      pageToken: 'my-page-token',
    });
  });

  it('should return an empty array when no sinks are found', async () => {
    const mockResponse = createMockListSinksResponse([]);
    const loggingClient = apiClientFactory.getLoggingClient();
    (loggingClient.projects.sinks.list as Mock).mockResolvedValue(mockResponse);

    const result = await listSinks(TEST_PROJECT_RESOURCE);
    expect(JSON.parse(result)).toEqual([]);
  });

  it('should throw an error if the API call fails', async () => {
    const errorMessage = 'API Error';
    const loggingClient = apiClientFactory.getLoggingClient();
    (loggingClient.projects.sinks.list as Mock).mockRejectedValue(new Error(errorMessage));

    await expect(listSinks(TEST_PROJECT_RESOURCE)).rejects.toThrow(
      `Failed to list log sinks: ${errorMessage}`,
    );
  });
});

describe('listLogScopes', () => {
  it('should return a JSON string of log scopes on success', async () => {
    const mockResponse = createMockListLogScopesResponse([{ name: 'test-scope' }]);
    const loggingClient = apiClientFactory.getLoggingClient();
    (loggingClient.projects.locations.logScopes.list as Mock).mockResolvedValue(mockResponse);

    const result = await listLogScopes(`${TEST_PROJECT_RESOURCE}/locations/global`);
    expect(JSON.parse(result)).toEqual(mockResponse.data!.logScopes);
    expect(loggingClient.projects.locations.logScopes.list).toHaveBeenCalledWith({
      parent: `${TEST_PROJECT_RESOURCE}/locations/global`,
      pageSize: undefined,
      pageToken: undefined,
    });
  });

  it('should pass all parameters correctly to the API call', async () => {
    const mockResponse = createMockListLogScopesResponse([]);
    const loggingClient = apiClientFactory.getLoggingClient();
    (loggingClient.projects.locations.logScopes.list as Mock).mockResolvedValue(mockResponse);

    await listLogScopes(`${TEST_PROJECT_RESOURCE}/locations/${TEST_LOCATION}`, 25, 'my-page-token');
    expect(loggingClient.projects.locations.logScopes.list).toHaveBeenCalledWith({
      parent: `${TEST_PROJECT_RESOURCE}/locations/${TEST_LOCATION}`,
      pageSize: 25,
      pageToken: 'my-page-token',
    });
  });

  it('should return an empty array when no log scopes are found', async () => {
    const mockResponse = createMockListLogScopesResponse([]);
    const loggingClient = apiClientFactory.getLoggingClient();
    (loggingClient.projects.locations.logScopes.list as Mock).mockResolvedValue(mockResponse);

    const result = await listLogScopes(`${TEST_PROJECT_RESOURCE}/locations/global`);
    expect(JSON.parse(result)).toEqual([]);
  });

  it('should throw an error if the API call fails', async () => {
    const errorMessage = 'API Error';
    const loggingClient = apiClientFactory.getLoggingClient();
    (loggingClient.projects.locations.logScopes.list as Mock).mockRejectedValue(
      new Error(errorMessage),
    );

    await expect(listLogScopes(`${TEST_PROJECT_RESOURCE}/locations/global`)).rejects.toThrow(
      `Failed to list log scopes: ${errorMessage}`,
    );
  });
});

describe('listLogNames', () => {
  it('should return a JSON string of log names on success', async () => {
    const mockResponse = createMockListLogNamesResponse(['projects/my-project/logs/my-log']);
    const loggingClient = apiClientFactory.getLoggingClient();
    (loggingClient.projects.logs.list as Mock).mockResolvedValue(mockResponse);

    const result = await listLogNames(TEST_PROJECT_RESOURCE);
    expect(JSON.parse(result)).toEqual(mockResponse.data!.logNames);
    expect(loggingClient.projects.logs.list).toHaveBeenCalledWith({
      parent: TEST_PROJECT_RESOURCE,
      pageSize: undefined,
      pageToken: undefined,
    });
  });

  it('should pass all parameters correctly to the API call', async () => {
    const mockResponse = createMockListLogNamesResponse([]);
    const loggingClient = apiClientFactory.getLoggingClient();
    (loggingClient.projects.logs.list as Mock).mockResolvedValue(mockResponse);

    await listLogNames('folders/f1', 25, 'my-page-token');

    expect(loggingClient.projects.logs.list).toHaveBeenCalledWith({
      parent: 'folders/f1',
      pageSize: 25,
      pageToken: 'my-page-token',
    });
  });

  it('should return an empty array when no log names are found', async () => {
    const mockResponse = createMockListLogNamesResponse([]);
    const loggingClient = apiClientFactory.getLoggingClient();
    (loggingClient.projects.logs.list as Mock).mockResolvedValue(mockResponse);

    const result = await listLogNames(TEST_PROJECT_RESOURCE);
    expect(JSON.parse(result)).toEqual([]);
  });

  it('should throw an error if the API call fails', async () => {
    const errorMessage = 'API Error';
    const loggingClient = apiClientFactory.getLoggingClient();
    (loggingClient.projects.logs.list as Mock).mockRejectedValue(new Error(errorMessage));

    await expect(listLogNames(TEST_PROJECT_RESOURCE)).rejects.toThrow(
      `Failed to list log names: ${errorMessage}`,
    );
  });
});
