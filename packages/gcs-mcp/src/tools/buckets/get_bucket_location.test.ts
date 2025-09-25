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
import { describe, it, expect, vi } from 'vitest';
import { getBucketLocation, registerGetBucketLocationTool } from './get_bucket_location.js';
import { apiClientFactory } from '../../utility/index.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

vi.mock('../../utility/index.js');
vi.mock('@modelcontextprotocol/sdk/server/mcp.js');

describe('getBucketLocation', () => {
  it('should return the location of a bucket', async () => {
    const mockMetadata = {
      location: 'US',
      locationType: 'multi-region',
      storageClass: 'STANDARD',
      timeCreated: '2025-01-01T00:00:00.000Z',
      updated: '2025-01-01T00:00:00.000Z',
    };
    const mockGetMetadata = vi.fn().mockResolvedValue([mockMetadata]);
    const mockBucket = {
      getMetadata: mockGetMetadata,
    };

    const mockStorageClient = {
      bucket: vi.fn().mockReturnValue(mockBucket),
    };

    (apiClientFactory.getStorageClient as vi.Mock).mockReturnValue(mockStorageClient);

    const result = await getBucketLocation({
      bucket_name: 'test-bucket',
    });

    expect(apiClientFactory.getStorageClient).toHaveBeenCalled();
    expect(mockStorageClient.bucket).toHaveBeenCalledWith('test-bucket');
    expect(mockGetMetadata).toHaveBeenCalled();
    const expectedJson = {
      bucket_name: 'test-bucket',
      location: 'US',
      location_type: 'multi-region',
      storage_class: 'STANDARD',
      time_created: '2025-01-01T00:00:00.000Z',
      updated: '2025-01-01T00:00:00.000Z',
    };
    expect(result.content).toEqual([
      {
        type: 'text',
        text: JSON.stringify(expectedJson, null, 2),
      },
    ]);
  });

  it('should return a "Not Found" error if the bucket does not exist', async () => {
    const mockGetMetadata = vi.fn().mockRejectedValue(new Error('Not Found'));
    const mockBucket = {
      getMetadata: mockGetMetadata,
    };

    const mockStorageClient = {
      bucket: vi.fn().mockReturnValue(mockBucket),
    };

    (apiClientFactory.getStorageClient as vi.Mock).mockReturnValue(mockStorageClient);

    const result = await getBucketLocation({
      bucket_name: 'test-bucket',
    });

    expect(result.content).toEqual([
      {
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: 'Error getting bucket location: Not Found',
          error_type: 'NotFound',
        }),
      },
    ]);
  });

  it('should return a "Forbidden" error if the user does not have permission', async () => {
    const mockGetMetadata = vi.fn().mockRejectedValue(new Error('Forbidden'));
    const mockBucket = {
      getMetadata: mockGetMetadata,
    };

    const mockStorageClient = {
      bucket: vi.fn().mockReturnValue(mockBucket),
    };

    (apiClientFactory.getStorageClient as vi.Mock).mockReturnValue(mockStorageClient);

    const result = await getBucketLocation({
      bucket_name: 'test-bucket',
    });

    expect(result.content).toEqual([
      {
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: 'Error getting bucket location: Forbidden',
          error_type: 'Forbidden',
        }),
      },
    ]);
  });
});

describe('registerGetBucketLocationTool', () => {
  it('should register the get_bucket_location tool with the server', () => {
    const mockServer = new McpServer();
    registerGetBucketLocationTool(mockServer);

    expect(mockServer.registerTool).toHaveBeenCalledWith(
      'get_bucket_location',
      expect.any(Object),
      getBucketLocation,
    );
  });
});
