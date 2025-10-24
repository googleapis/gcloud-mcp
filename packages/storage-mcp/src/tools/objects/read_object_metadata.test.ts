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
import { readObjectMetadata, registerReadObjectMetadataTool } from './read_object_metadata.js';
import { apiClientFactory } from '../../utility/index.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

vi.mock('../../utility/index.js');
vi.mock('@modelcontextprotocol/sdk/server/mcp.js');

import { formatFileMetadataResponse } from '../../utility/gcs_helpers.js';

vi.mock('../../utility/gcs_helpers.js');
vi.mock('../../utility/index.js');
vi.mock('@modelcontextprotocol/sdk/server/mcp.js');

describe('readObjectMetadata', () => {
  it('should return the metadata of an object', async () => {
    const mockMetadata = {
      name: 'test-object',
      bucket: 'test-bucket',
      contentType: 'text/plain',
    };
    const mockGet = vi.fn().mockResolvedValue([{ metadata: mockMetadata }]);
    const mockFile = vi.fn().mockReturnValue({
      get: mockGet,
    });
    const mockBucket = vi.fn().mockReturnValue({
      file: mockFile,
    });

    const mockStorageClient = {
      bucket: mockBucket,
    };

    (apiClientFactory.getStorageClient as vi.Mock).mockReturnValue(mockStorageClient);
    (formatFileMetadataResponse as vi.Mock).mockReturnValue(mockMetadata);

    const result = await readObjectMetadata({
      bucket_name: 'test-bucket',
      object_name: 'test-object',
    });

    expect(apiClientFactory.getStorageClient).toHaveBeenCalled();
    expect(mockBucket).toHaveBeenCalledWith('test-bucket');
    expect(mockFile).toHaveBeenCalledWith('test-object');
    expect(mockGet).toHaveBeenCalled();
    expect(result.content).toEqual([{ type: 'text', text: JSON.stringify(mockMetadata, null, 2) }]);
  });

  it('should return a "Not Found" error if the file does not exist', async () => {
    const mockGet = vi.fn().mockResolvedValue([]);
    const mockFile = vi.fn().mockReturnValue({
      get: mockGet,
    });
    const mockBucket = vi.fn().mockReturnValue({
      file: mockFile,
    });

    const mockStorageClient = {
      bucket: mockBucket,
    };

    (apiClientFactory.getStorageClient as vi.Mock).mockReturnValue(mockStorageClient);

    const result = await readObjectMetadata({
      bucket_name: 'test-bucket',
      object_name: 'test-object',
    });

    expect(result.content).toEqual([
      {
        type: 'text',
        text: JSON.stringify({
          error: 'Object test-object not found in bucket test-bucket',
          error_type: 'NotFound',
        }),
      },
    ]);
  });

  it('should return a "Not Found" error if the object does not exist', async () => {
    const mockGet = vi.fn().mockRejectedValue(new Error('Not Found'));
    const mockFile = vi.fn().mockReturnValue({
      get: mockGet,
    });
    const mockBucket = vi.fn().mockReturnValue({
      file: mockFile,
    });

    const mockStorageClient = {
      bucket: mockBucket,
    };

    (apiClientFactory.getStorageClient as vi.Mock).mockReturnValue(mockStorageClient);

    const result = await readObjectMetadata({
      bucket_name: 'test-bucket',
      object_name: 'test-object',
    });

    expect(result.content).toEqual([
      {
        type: 'text',
        text: JSON.stringify({
          error: 'Error reading object metadata: Not Found',
          error_type: 'NotFound',
        }),
      },
    ]);
  });

  it('should return a "Forbidden" error if the user does not have permission', async () => {
    const mockGet = vi.fn().mockRejectedValue(new Error('Forbidden'));
    const mockFile = vi.fn().mockReturnValue({
      get: mockGet,
    });
    const mockBucket = vi.fn().mockReturnValue({
      file: mockFile,
    });

    const mockStorageClient = {
      bucket: mockBucket,
    };

    (apiClientFactory.getStorageClient as vi.Mock).mockReturnValue(mockStorageClient);

    const result = await readObjectMetadata({
      bucket_name: 'test-bucket',
      object_name: 'test-object',
    });

    expect(result.content).toEqual([
      {
        type: 'text',
        text: JSON.stringify({
          error: 'Error reading object metadata: Forbidden',
          error_type: 'Forbidden',
        }),
      },
    ]);
  });
});

describe('registerReadObjectMetadataTool', () => {
  it('should register the read_object_metadata tool with the server', () => {
    const mockServer = new McpServer();
    registerReadObjectMetadataTool(mockServer);

    expect(mockServer.registerTool).toHaveBeenCalledWith(
      'read_object_metadata',
      expect.any(Object),
      readObjectMetadata,
    );
  });
});
