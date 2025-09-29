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
import { deleteObject, registerDeleteObjectTool } from './delete_object.js';
import { apiClientFactory } from '../../utility/index.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

vi.mock('../../utility/index.js');
vi.mock('@modelcontextprotocol/sdk/server/mcp.js');

describe('deleteObject', () => {
  it('should delete an object and return a success message', async () => {
    const mockDelete = vi.fn().mockResolvedValue(undefined);
    const mockFile = vi.fn().mockReturnValue({
      delete: mockDelete,
    });
    const mockBucket = vi.fn().mockReturnValue({
      file: mockFile,
    });

    const mockStorageClient = {
      bucket: mockBucket,
    };

    (apiClientFactory.getStorageClient as vi.Mock).mockReturnValue(mockStorageClient);

    const result = await deleteObject({
      bucket_name: 'test-bucket',
      object_name: 'test-object',
    });

    expect(apiClientFactory.getStorageClient).toHaveBeenCalled();
    expect(mockBucket).toHaveBeenCalledWith('test-bucket');
    expect(mockFile).toHaveBeenCalledWith('test-object');
    expect(mockDelete).toHaveBeenCalled();
    const expectedJson = {
      success: true,
      message: 'Object test-object deleted successfully from bucket test-bucket',
      bucket: 'test-bucket',
      object: 'test-object',
    };
    expect(result.content).toEqual([
      {
        type: 'text',
        text: JSON.stringify(expectedJson, null, 2),
      },
    ]);
  });

  it('should return a "Not Found" error if the bucket or object does not exist', async () => {
    const mockDelete = vi.fn().mockRejectedValue(new Error('Not Found'));
    const mockFile = vi.fn().mockReturnValue({
      delete: mockDelete,
    });
    const mockBucket = vi.fn().mockReturnValue({
      file: mockFile,
    });

    const mockStorageClient = {
      bucket: mockBucket,
    };

    (apiClientFactory.getStorageClient as vi.Mock).mockReturnValue(mockStorageClient);

    const result = await deleteObject({
      bucket_name: 'test-bucket',
      object_name: 'test-object',
    });

    expect(result.content).toEqual([
      {
        type: 'text',
        text: JSON.stringify({
          error: 'Error deleting object: Not Found',
          error_type: 'NotFound',
        }),
      },
    ]);
  });

  it('should return a "Forbidden" error if the user does not have permission', async () => {
    const mockDelete = vi.fn().mockRejectedValue(new Error('Forbidden'));
    const mockFile = vi.fn().mockReturnValue({
      delete: mockDelete,
    });
    const mockBucket = vi.fn().mockReturnValue({
      file: mockFile,
    });

    const mockStorageClient = {
      bucket: mockBucket,
    };

    (apiClientFactory.getStorageClient as vi.Mock).mockReturnValue(mockStorageClient);

    const result = await deleteObject({
      bucket_name: 'test-bucket',
      object_name: 'test-object',
    });

    expect(result.content).toEqual([
      {
        type: 'text',
        text: JSON.stringify({
          error: 'Error deleting object: Forbidden',
          error_type: 'Forbidden',
        }),
      },
    ]);
  });
});

describe('registerDeleteObjectTool', () => {
  it('should register the delete_object tool with the server', () => {
    const mockServer = new McpServer();
    registerDeleteObjectTool(mockServer);

    expect(mockServer.registerTool).toHaveBeenCalledWith(
      'delete_object',
      expect.any(Object),
      deleteObject,
    );
  });
});
