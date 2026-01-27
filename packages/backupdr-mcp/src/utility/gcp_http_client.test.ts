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

/// <reference types="vitest/globals" />

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { GoogleCloudHTTPClient } from './gcp_http_client.js';
import { GoogleAuth } from 'google-auth-library';
import { apiClientFactory } from './api_client_factory.js';

// Mock GoogleAuth
vi.mock('google-auth-library');
// Mock apiClientFactory
vi.mock('./api_client_factory.js', () => ({
  apiClientFactory: {
    getSqlOperationsClient: vi.fn(),
  },
}));

describe('GoogleCloudHTTPClient', () => {
  let client: GoogleCloudHTTPClient;
  const mockRequest = vi.fn();
  const mockGetOperation = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock the GoogleAuth implementation
    (GoogleAuth as Mock).mockImplementation(() => ({
      getClient: vi.fn().mockResolvedValue({
        request: mockRequest,
      }),
    }));

    // Mock SqlOperationsServiceClient
    (apiClientFactory.getSqlOperationsClient as Mock).mockReturnValue({
      get: mockGetOperation,
    });

    // Create a fresh instance for testing (instead of using the exported singleton)
    client = new GoogleCloudHTTPClient();
  });

  it('should initialize GoogleAuth with correct scopes', () => {
    expect(GoogleAuth).toHaveBeenCalledWith({
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
  });

  it('should make a GET request for listResourceBackupConfigs', async () => {
    // Setup Mock Response
    mockRequest.mockResolvedValue({ data: { items: [] } });

    const params = {
      projectId: 'my-proj',
      location: 'us-east1',
      pageSize: 50,
    };

    await client.listResourceBackupConfigs(params);

    expect(mockRequest).toHaveBeenCalledWith({
      url: 'https://backupdr.googleapis.com/v1/projects/my-proj/locations/us-east1/resourceBackupConfigs',
      method: 'GET',
      params: {
        pageSize: 50,
        pageToken: undefined,
        filter: undefined,
        orderBy: undefined,
      },
    });
  });

  it('should make a POST request for csqlRestore', async () => {
    mockRequest.mockResolvedValue({ data: { name: 'operation-123' } });

    await client.csqlRestore('my-proj', 'my-instance', 'my-backup');

    expect(mockRequest).toHaveBeenCalledWith({
      url: 'https://sqladmin.googleapis.com/sql/v1beta4/projects/my-proj/instances/my-instance/restoreBackup?alt=json',
      method: 'POST',
      data: {
        backupdrBackup: 'my-backup',
      },
    });
  });

  it('should use SqlOperationsServiceClient for getCsqlOperation', async () => {
    mockGetOperation.mockResolvedValue([{ name: 'op-123', status: 'RUNNING' }]);

    await client.getCsqlOperation('my-proj', 'op-123');

    expect(mockGetOperation).toHaveBeenCalledWith({
      project: 'my-proj',
      operation: 'op-123',
    });
  });

  it('should poll until DONE in waitForCsqlOperation', async () => {
    vi.useFakeTimers();
    mockGetOperation
      .mockResolvedValueOnce([{ name: 'op-123', status: 'RUNNING' }])
      .mockResolvedValueOnce([{ name: 'op-123', status: 'DONE' }]);

    const waitPromise = client.waitForCsqlOperation('my-proj', 'op-123');

    // First poll
    await vi.advanceTimersByTimeAsync(0);
    // Second poll after 10s
    await vi.advanceTimersByTimeAsync(10000);

    const result = await waitPromise;
    expect(result.status).toBe('DONE');
    expect(mockGetOperation).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('should throw if operation has error in waitForCsqlOperation', async () => {
    mockGetOperation.mockResolvedValue([
      { name: 'op-123', status: 'DONE', error: { errors: [{ message: 'Failed' }] } },
    ]);

    await expect(client.waitForCsqlOperation('my-proj', 'op-123')).rejects.toThrow(
      'Operation failed: {"errors":[{"message":"Failed"}]}',
    );
  });

  it('should propagate errors from the HTTP client', async () => {
    mockRequest.mockRejectedValue(new Error('Network Error'));

    await expect(
      client.listResourceBackupConfigs({
        projectId: 'p',
        location: 'l',
      }),
    ).rejects.toThrow('Network Error');
  });
});
