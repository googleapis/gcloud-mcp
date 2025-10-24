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
import { listBuckets, registerListBucketsTool } from './list_buckets.js';
import { apiClientFactory } from '../../utility/index.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

vi.mock('../../utility/index.js');
vi.mock('@modelcontextprotocol/sdk/server/mcp.js');

describe('listBuckets', () => {
  it('should return a list of bucket names', async () => {
    const mockBuckets = [{ name: 'bucket-1' }, { name: 'bucket-2' }];
    const mockGetBuckets = vi.fn().mockResolvedValue([mockBuckets]);
    const mockStorageClient = {
      getBuckets: mockGetBuckets,
    };

    (apiClientFactory.getStorageClient as vi.Mock).mockReturnValue(mockStorageClient);

    const result = await listBuckets({ project_id: 'test-project' });

    expect(apiClientFactory.getStorageClient).toHaveBeenCalled();
    expect(mockGetBuckets).toHaveBeenCalledWith({
      userProject: 'test-project',
    });
    expect(result.content).toEqual([{ type: 'text', text: 'bucket-1\nbucket-2' }]);
  });

  it('should return "No buckets found." if no buckets are returned', async () => {
    const mockGetBuckets = vi.fn().mockResolvedValue([[]]);
    const mockStorageClient = {
      getBuckets: mockGetBuckets,
    };

    (apiClientFactory.getStorageClient as vi.Mock).mockReturnValue(mockStorageClient);

    const result = await listBuckets({ project_id: 'test-project' });

    expect(result.content).toEqual([{ type: 'text', text: 'No buckets found.' }]);
  });

  it('should throw an error if project_id is not provided', async () => {
    const originalEnv = process.env;
    delete process.env['GOOGLE_CLOUD_PROJECT'];
    await expect(listBuckets({})).rejects.toThrow(
      'Project ID not specified. Please specify via the project_id parameter or GOOGLE_CLOUD_PROJECT environment variable.',
    );
    process.env = originalEnv;
  });
});

describe('registerListBucketsTool', () => {
  it('should register the list_buckets tool with the server', () => {
    const mockServer = new McpServer();
    registerListBucketsTool(mockServer);

    expect(mockServer.registerTool).toHaveBeenCalledWith(
      'list_buckets',
      expect.any(Object),
      listBuckets,
    );
  });
});
