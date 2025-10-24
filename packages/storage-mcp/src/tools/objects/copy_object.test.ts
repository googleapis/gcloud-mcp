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
import { copyObject, registerCopyObjectTool } from './copy_object.js';
import { apiClientFactory } from '../../utility/index.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

vi.mock('../../utility/index.js');
vi.mock('@modelcontextprotocol/sdk/server/mcp.js');

describe('copyObject', () => {
  it('should copy an object and return a success message', async () => {
    const mockFile = {
      copy: vi.fn().mockResolvedValue([
        {
          metadata: {
            size: 123,
            generation: '1',
          },
        },
      ]),
    };
    const mockBucket = {
      file: vi.fn().mockReturnValue(mockFile),
    };
    const mockStorageClient = {
      bucket: vi.fn().mockReturnValue(mockBucket),
    };

    (apiClientFactory.getStorageClient as vi.Mock).mockReturnValue(mockStorageClient);

    const result = await copyObject({
      source_bucket_name: 'source-bucket',
      source_object_name: 'source-object',
      destination_bucket_name: 'dest-bucket',
      destination_object_name: 'dest-object',
    });

    expect(apiClientFactory.getStorageClient).toHaveBeenCalled();
    expect(mockStorageClient.bucket).toHaveBeenCalledWith('source-bucket');
    expect(mockBucket.file).toHaveBeenCalledWith('source-object');
    const expectedJson = {
      success: true,
      message:
        'Object source-object copied successfully from bucket source-bucket to dest-object in bucket dest-bucket',
      source_bucket: 'source-bucket',
      source_object: 'source-object',
      destination_bucket: 'dest-bucket',
      destination_object: 'dest-object',
      copied_object_size: 123,
      copied_object_generation: '1',
    };
    expect(result.content).toEqual([
      {
        type: 'text',
        text: JSON.stringify(expectedJson, null, 2),
      },
    ]);
  });

  it('should return a "Not Found" error if the source bucket or object does not exist', async () => {
    const mockFile = {
      copy: vi.fn().mockRejectedValue(new Error('Not Found')),
    };
    const mockBucket = {
      file: vi.fn().mockReturnValue(mockFile),
    };
    const mockStorageClient = {
      bucket: vi.fn().mockReturnValue(mockBucket),
    };

    (apiClientFactory.getStorageClient as vi.Mock).mockReturnValue(mockStorageClient);

    const result = await copyObject({
      source_bucket_name: 'source-bucket',
      source_object_name: 'source-object',
      destination_bucket_name: 'dest-bucket',
      destination_object_name: 'dest-object',
    });

    expect(result.content).toEqual([
      {
        type: 'text',
        text: JSON.stringify({
          error: 'Error copying object: Not Found',
          error_type: 'NotFound',
        }),
      },
    ]);
  });

  it('should return a "Forbidden" error if the user does not have permission', async () => {
    const mockFile = {
      copy: vi.fn().mockRejectedValue(new Error('Forbidden')),
    };
    const mockBucket = {
      file: vi.fn().mockReturnValue(mockFile),
    };
    const mockStorageClient = {
      bucket: vi.fn().mockReturnValue(mockBucket),
    };

    (apiClientFactory.getStorageClient as vi.Mock).mockReturnValue(mockStorageClient);

    const result = await copyObject({
      source_bucket_name: 'source-bucket',
      source_object_name: 'source-object',
      destination_bucket_name: 'dest-bucket',
      destination_object_name: 'dest-object',
    });

    expect(result.content).toEqual([
      {
        type: 'text',
        text: JSON.stringify({
          error: 'Error copying object: Forbidden',
          error_type: 'Forbidden',
        }),
      },
    ]);
  });
});

describe('registerCopyObjectTool', () => {
  it('should register the copy_object tool with the server', () => {
    const mockServer = new McpServer();
    registerCopyObjectTool(mockServer);

    expect(mockServer.registerTool).toHaveBeenCalledWith(
      'copy_object',
      expect.any(Object),
      copyObject,
    );
  });
});
