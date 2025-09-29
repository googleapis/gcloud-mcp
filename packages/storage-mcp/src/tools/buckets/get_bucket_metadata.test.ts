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
import { getBucketMetadata, registerGetBucketMetadataTool } from './get_bucket_metadata.js';
import { apiClientFactory } from '../../utility/index.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

vi.mock('../../utility/index.js');
vi.mock('@modelcontextprotocol/sdk/server/mcp.js');

describe('getBucketMetadata', () => {
  it('should return the metadata of a bucket', async () => {
    const mockMetadata = {
      name: 'test-bucket',
      location: 'US',
      storageClass: 'STANDARD',
    };
    const mockGetMetadata = vi.fn().mockResolvedValue([mockMetadata]);
    const mockBucket = {
      getMetadata: mockGetMetadata,
    };

    const mockStorageClient = {
      bucket: vi.fn().mockReturnValue(mockBucket),
    };

    (apiClientFactory.getStorageClient as vi.Mock).mockReturnValue(mockStorageClient);

    const result = await getBucketMetadata({
      bucket_name: 'test-bucket',
    });

    expect(apiClientFactory.getStorageClient).toHaveBeenCalled();
    expect(mockStorageClient.bucket).toHaveBeenCalledWith('test-bucket');
    expect(mockGetMetadata).toHaveBeenCalled();
    expect(result.content).toEqual([{ type: 'text', text: JSON.stringify(mockMetadata, null, 2) }]);
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

    const result = await getBucketMetadata({
      bucket_name: 'test-bucket',
    });

    expect(result.content).toEqual([
      {
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: 'Error getting bucket metadata: Not Found',
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

    const result = await getBucketMetadata({
      bucket_name: 'test-bucket',
    });

    expect(result.content).toEqual([
      {
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: 'Error getting bucket metadata: Forbidden',
          error_type: 'Forbidden',
        }),
      },
    ]);
  });
});

describe('registerGetBucketMetadataTool', () => {
  it('should register the get_bucket_metadata tool with the server', () => {
    const mockServer = new McpServer();
    registerGetBucketMetadataTool(mockServer);

    expect(mockServer.registerTool).toHaveBeenCalledWith(
      'get_bucket_metadata',
      expect.any(Object),
      getBucketMetadata,
    );
  });
});
