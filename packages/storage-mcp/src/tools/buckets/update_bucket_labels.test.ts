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
import { updateBucketLabels, registerUpdateBucketLabelsTool } from './update_bucket_labels.js';
import { apiClientFactory } from '../../utility/index.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

vi.mock('../../utility/index.js');
vi.mock('@modelcontextprotocol/sdk/server/mcp.js');

describe('updateBucketLabels', () => {
  it('should update the labels of a bucket and return a success message', async () => {
    const mockMetadata = { labels: { key1: 'value1' } };
    const mockSetLabels = vi.fn().mockResolvedValue([mockMetadata]);
    const mockBucket = {
      setLabels: mockSetLabels,
    };

    const mockStorageClient = {
      bucket: vi.fn().mockReturnValue(mockBucket),
    };

    (apiClientFactory.getStorageClient as vi.Mock).mockReturnValue(mockStorageClient);

    const result = await updateBucketLabels({
      bucket_name: 'test-bucket',
      labels: { key1: 'value1' },
    });

    expect(apiClientFactory.getStorageClient).toHaveBeenCalled();
    expect(mockStorageClient.bucket).toHaveBeenCalledWith('test-bucket');
    expect(mockSetLabels).toHaveBeenCalledWith({ key1: 'value1' });
    const expectedJson = {
      success: true,
      message: 'Labels for bucket test-bucket updated successfully',
      bucket_name: 'test-bucket',
      updated_labels: { key1: 'value1' },
    };
    expect(result.content).toEqual([
      {
        type: 'text',
        text: JSON.stringify(expectedJson, null, 2),
      },
    ]);
  });

  it('should return a "Not Found" error if the bucket does not exist', async () => {
    const mockSetLabels = vi.fn().mockRejectedValue(new Error('Not Found'));
    const mockBucket = {
      setLabels: mockSetLabels,
    };

    const mockStorageClient = {
      bucket: vi.fn().mockReturnValue(mockBucket),
    };

    (apiClientFactory.getStorageClient as vi.Mock).mockReturnValue(mockStorageClient);

    const result = await updateBucketLabels({
      bucket_name: 'test-bucket',
      labels: { key1: 'value1' },
    });

    expect(result.content).toEqual([
      {
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: 'Error updating bucket labels: Not Found',
          error_type: 'NotFound',
        }),
      },
    ]);
  });

  it('should return a "Forbidden" error if the user does not have permission', async () => {
    const mockSetLabels = vi.fn().mockRejectedValue(new Error('Forbidden'));
    const mockBucket = {
      setLabels: mockSetLabels,
    };

    const mockStorageClient = {
      bucket: vi.fn().mockReturnValue(mockBucket),
    };

    (apiClientFactory.getStorageClient as vi.Mock).mockReturnValue(mockStorageClient);

    const result = await updateBucketLabels({
      bucket_name: 'test-bucket',
      labels: { key1: 'value1' },
    });

    expect(result.content).toEqual([
      {
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: 'Error updating bucket labels: Forbidden',
          error_type: 'Forbidden',
        }),
      },
    ]);
  });

  it('should return a "BadRequest" error if the request is invalid', async () => {
    const mockSetLabels = vi.fn().mockRejectedValue(new Error('Invalid'));
    const mockBucket = {
      setLabels: mockSetLabels,
    };

    const mockStorageClient = {
      bucket: vi.fn().mockReturnValue(mockBucket),
    };

    (apiClientFactory.getStorageClient as vi.Mock).mockReturnValue(mockStorageClient);

    const result = await updateBucketLabels({
      bucket_name: 'test-bucket',
      labels: { key1: 'value1' },
    });

    expect(result.content).toEqual([
      {
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: 'Error updating bucket labels: Invalid',
          error_type: 'BadRequest',
        }),
      },
    ]);
  });
});

describe('registerUpdateBucketLabelsTool', () => {
  it('should register the update_bucket_labels tool with the server', () => {
    const mockServer = new McpServer();
    registerUpdateBucketLabelsTool(mockServer);

    expect(mockServer.registerTool).toHaveBeenCalledWith(
      'update_bucket_labels',
      expect.any(Object),
      updateBucketLabels,
    );
  });
});
