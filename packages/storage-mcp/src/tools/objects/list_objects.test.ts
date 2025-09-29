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
import { listObjects, registerListObjectsTool } from './list_objects.js';
import { apiClientFactory } from '../../utility/index.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

vi.mock('../../utility/index.js');
vi.mock('@modelcontextprotocol/sdk/server/mcp.js');

describe('listObjects', () => {
  it('should return a list of object names', async () => {
    const mockFiles = [{ name: 'object-1' }, { name: 'object-2' }];
    const mockGetFiles = vi.fn().mockResolvedValue([mockFiles, null]);
    const mockBucket = {
      getFiles: mockGetFiles,
    };

    const mockStorageClient = {
      bucket: vi.fn().mockReturnValue(mockBucket),
    };

    (apiClientFactory.getStorageClient as vi.Mock).mockReturnValue(mockStorageClient);

    const result = await listObjects({
      bucket_name: 'test-bucket',
    });

    expect(apiClientFactory.getStorageClient).toHaveBeenCalled();
    expect(mockStorageClient.bucket).toHaveBeenCalledWith('test-bucket');
    expect(mockGetFiles).toHaveBeenCalled();
    const expectedJson = {
      bucket: 'test-bucket',
      prefix: undefined,
      delimiter: undefined,
      object_count: 2,
      objects: ['object-1', 'object-2'],
      next_page_token: null,
    };
    expect(result.content).toEqual([
      {
        type: 'text',
        text: JSON.stringify(expectedJson, null, 2),
      },
    ]);
  });

  it('should return a list of object names with all options', async () => {
    const mockFiles = [{ name: 'object-1' }, { name: 'object-2' }];
    const mockGetFiles = vi.fn().mockResolvedValue([mockFiles, { pageToken: 'next-page-token' }]);
    const mockBucket = {
      getFiles: mockGetFiles,
    };

    const mockStorageClient = {
      bucket: vi.fn().mockReturnValue(mockBucket),
    };

    (apiClientFactory.getStorageClient as vi.Mock).mockReturnValue(mockStorageClient);

    const result = await listObjects({
      bucket_name: 'test-bucket',
      prefix: 'prefix',
      delimiter: '/',
      max_results: 100,
      page_token: 'page-token',
      versions: true,
    });

    expect(apiClientFactory.getStorageClient).toHaveBeenCalled();
    expect(mockStorageClient.bucket).toHaveBeenCalledWith('test-bucket');
    expect(mockGetFiles).toHaveBeenCalledWith({
      prefix: 'prefix',
      delimiter: '/',
      maxResults: 100,
      pageToken: 'page-token',
      versions: true,
    });
    const expectedJson = {
      bucket: 'test-bucket',
      prefix: 'prefix',
      delimiter: '/',
      object_count: 2,
      objects: ['object-1', 'object-2'],
      next_page_token: 'next-page-token',
    };
    expect(result.content).toEqual([
      {
        type: 'text',
        text: JSON.stringify(expectedJson, null, 2),
      },
    ]);
  });

  it('should return "No objects found." if no objects are returned', async () => {
    const mockGetFiles = vi.fn().mockResolvedValue([[], null]);
    const mockBucket = {
      getFiles: mockGetFiles,
    };

    const mockStorageClient = {
      bucket: vi.fn().mockReturnValue(mockBucket),
    };

    (apiClientFactory.getStorageClient as vi.Mock).mockReturnValue(mockStorageClient);

    const result = await listObjects({ bucket_name: 'test-bucket' });

    const expectedJson = {
      bucket: 'test-bucket',
      prefix: undefined,
      delimiter: undefined,
      object_count: 0,
      objects: [],
      next_page_token: null,
    };
    expect(result.content).toEqual([
      {
        type: 'text',
        text: JSON.stringify(expectedJson, null, 2),
      },
    ]);
  });

  it('should return a "Not Found" error if the bucket does not exist', async () => {
    const mockGetFiles = vi.fn().mockRejectedValue(new Error('Not Found'));
    const mockBucket = {
      getFiles: mockGetFiles,
    };

    const mockStorageClient = {
      bucket: vi.fn().mockReturnValue(mockBucket),
    };

    (apiClientFactory.getStorageClient as vi.Mock).mockReturnValue(mockStorageClient);

    const result = await listObjects({ bucket_name: 'test-bucket' });

    expect(result.content).toEqual([
      {
        type: 'text',
        text: JSON.stringify({
          error: 'Error listing objects: Not Found',
          error_type: 'NotFound',
        }),
      },
    ]);
  });

  it('should return a "Forbidden" error if the user does not have permission', async () => {
    const mockGetFiles = vi.fn().mockRejectedValue(new Error('Forbidden'));
    const mockBucket = {
      getFiles: mockGetFiles,
    };

    const mockStorageClient = {
      bucket: vi.fn().mockReturnValue(mockBucket),
    };

    (apiClientFactory.getStorageClient as vi.Mock).mockReturnValue(mockStorageClient);

    const result = await listObjects({ bucket_name: 'test-bucket' });

    expect(result.content).toEqual([
      {
        type: 'text',
        text: JSON.stringify({
          error: 'Error listing objects: Forbidden',
          error_type: 'Forbidden',
        }),
      },
    ]);
  });
});

describe('registerListObjectsTool', () => {
  it('should register the list_objects tool with the server', () => {
    const mockServer = new McpServer();
    registerListObjectsTool(mockServer);

    expect(mockServer.registerTool).toHaveBeenCalledWith(
      'list_objects',
      expect.any(Object),
      listObjects,
    );
  });
});
