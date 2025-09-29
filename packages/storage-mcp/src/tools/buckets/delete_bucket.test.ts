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
import { deleteBucket, registerDeleteBucketTool } from './delete_bucket.js';
import { apiClientFactory } from '../../utility/index.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

vi.mock('../../utility/index.js');
vi.mock('@modelcontextprotocol/sdk/server/mcp.js');

describe('deleteBucket', () => {
  it('should delete a bucket and return a success message', async () => {
    const mockDelete = vi.fn().mockResolvedValue(undefined);
    const mockExists = vi.fn().mockResolvedValue([true]);
    const mockBucket = {
      delete: mockDelete,
      exists: mockExists,
    };

    const mockStorageClient = {
      bucket: vi.fn().mockReturnValue(mockBucket),
    };

    (apiClientFactory.getStorageClient as vi.Mock).mockReturnValue(mockStorageClient);

    const result = await deleteBucket({
      bucket_name: 'test-bucket',
    });

    expect(apiClientFactory.getStorageClient).toHaveBeenCalled();
    expect(mockStorageClient.bucket).toHaveBeenCalledWith('test-bucket');
    expect(mockExists).toHaveBeenCalled();
    expect(mockDelete).toHaveBeenCalled();
    const expectedJson = {
      success: true,
      message: 'Bucket test-bucket deleted successfully',
      bucket_name: 'test-bucket',
      force_delete: false,
    };
    expect(result.content).toEqual([
      {
        type: 'text',
        text: JSON.stringify(expectedJson),
      },
    ]);
  });

  it('should return a "Not Found" error if the bucket does not exist initially', async () => {
    const mockExists = vi.fn().mockResolvedValue([false]);
    const mockBucket = {
      exists: mockExists,
    };

    const mockStorageClient = {
      bucket: vi.fn().mockReturnValue(mockBucket),
    };

    (apiClientFactory.getStorageClient as vi.Mock).mockReturnValue(mockStorageClient);

    const result = await deleteBucket({
      bucket_name: 'test-bucket',
    });

    expect(result.content).toEqual([
      {
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: 'Bucket test-bucket not found',
          error_type: 'NotFound',
        }),
      },
    ]);
  });

  it('should force delete a bucket and return a success message', async () => {
    const mockDelete = vi.fn().mockResolvedValue(undefined);
    const mockDeleteFiles = vi.fn().mockResolvedValue(undefined);
    const mockExists = vi.fn().mockResolvedValue([true]);
    const mockBucket = {
      delete: mockDelete,
      deleteFiles: mockDeleteFiles,
      exists: mockExists,
    };

    const mockStorageClient = {
      bucket: vi.fn().mockReturnValue(mockBucket),
    };

    (apiClientFactory.getStorageClient as vi.Mock).mockReturnValue(mockStorageClient);

    const result = await deleteBucket({
      bucket_name: 'test-bucket',
      force: true,
    });

    expect(apiClientFactory.getStorageClient).toHaveBeenCalled();
    expect(mockStorageClient.bucket).toHaveBeenCalledWith('test-bucket');
    expect(mockExists).toHaveBeenCalled();
    expect(mockDeleteFiles).toHaveBeenCalledWith({ force: true });
    expect(mockDelete).toHaveBeenCalled();
    const expectedJson = {
      success: true,
      message: 'Bucket test-bucket deleted successfully',
      bucket_name: 'test-bucket',
      force_delete: true,
    };
    expect(result.content).toEqual([
      {
        type: 'text',
        text: JSON.stringify(expectedJson),
      },
    ]);
  });

  it('should return a "Not Found" error if the bucket does not exist', async () => {
    const mockDelete = vi.fn().mockRejectedValue(new Error('Not Found'));
    const mockExists = vi.fn().mockResolvedValue([true]);
    const mockBucket = {
      delete: mockDelete,
      exists: mockExists,
    };

    const mockStorageClient = {
      bucket: vi.fn().mockReturnValue(mockBucket),
    };

    (apiClientFactory.getStorageClient as vi.Mock).mockReturnValue(mockStorageClient);

    const result = await deleteBucket({
      bucket_name: 'test-bucket',
    });

    expect(result.content).toEqual([
      {
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: 'Error deleting bucket: Not Found',
          error_type: 'NotFound',
        }),
      },
    ]);
  });

  it('should return a "Forbidden" error if the user does not have permission', async () => {
    const mockDelete = vi.fn().mockRejectedValue(new Error('Forbidden'));
    const mockExists = vi.fn().mockResolvedValue([true]);
    const mockBucket = {
      delete: mockDelete,
      exists: mockExists,
    };

    const mockStorageClient = {
      bucket: vi.fn().mockReturnValue(mockBucket),
    };

    (apiClientFactory.getStorageClient as vi.Mock).mockReturnValue(mockStorageClient);

    const result = await deleteBucket({
      bucket_name: 'test-bucket',
    });

    expect(result.content).toEqual([
      {
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: 'Error deleting bucket: Forbidden',
          error_type: 'Forbidden',
        }),
      },
    ]);
  });

  it('should return a "BadRequest" error if the bucket is not empty', async () => {
    const mockDelete = vi.fn().mockRejectedValue(new Error('not be empty'));
    const mockExists = vi.fn().mockResolvedValue([true]);
    const mockBucket = {
      delete: mockDelete,
      exists: mockExists,
    };

    const mockStorageClient = {
      bucket: vi.fn().mockReturnValue(mockBucket),
    };

    (apiClientFactory.getStorageClient as vi.Mock).mockReturnValue(mockStorageClient);

    const result = await deleteBucket({
      bucket_name: 'test-bucket',
    });

    expect(result.content).toEqual([
      {
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: 'Error deleting bucket: not be empty',
          error_type: 'BadRequest',
          suggestion: 'Use force=True to delete non-empty bucket',
        }),
      },
    ]);
  });
});

describe('registerDeleteBucketTool', () => {
  it('should register the delete_bucket tool with the server', () => {
    const mockServer = new McpServer();
    registerDeleteBucketTool(mockServer);

    expect(mockServer.registerTool).toHaveBeenCalledWith(
      'delete_bucket',
      expect.any(Object),
      deleteBucket,
    );
  });
});
