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
import {
  updateObjectMetadata,
  registerUpdateObjectMetadataTool,
} from './update_object_metadata.js';
import { apiClientFactory } from '../../utility/index.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

vi.mock('../../utility/index.js');
vi.mock('@modelcontextprotocol/sdk/server/mcp.js');

describe('updateObjectMetadata', () => {
  it('should update the metadata of an object and return a success message', async () => {
    const mockSetMetadata = vi.fn().mockResolvedValue(undefined);
    const mockFile = vi.fn().mockReturnValue({
      setMetadata: mockSetMetadata,
    });
    const mockBucket = vi.fn().mockReturnValue({
      file: mockFile,
    });

    const mockStorageClient = {
      bucket: mockBucket,
    };

    (apiClientFactory.getStorageClient as vi.Mock).mockReturnValue(mockStorageClient);

    const metadata = { contentType: 'application/json' };
    const result = await updateObjectMetadata({
      bucket_name: 'test-bucket',
      object_name: 'test-object',
      metadata,
    });

    expect(apiClientFactory.getStorageClient).toHaveBeenCalled();
    expect(mockBucket).toHaveBeenCalledWith('test-bucket');
    expect(mockFile).toHaveBeenCalledWith('test-object');
    expect(mockSetMetadata).toHaveBeenCalledWith({ metadata });
    const expectedJson = {
      success: true,
      message: 'Metadata for object test-object updated successfully',
      bucket: 'test-bucket',
      object: 'test-object',
      updated_metadata: metadata,
    };
    expect(result.content).toEqual([
      {
        type: 'text',
        text: JSON.stringify(expectedJson, null, 2),
      },
    ]);
  });

  it('should return a "Not Found" error if the object does not exist', async () => {
    const mockSetMetadata = vi.fn().mockRejectedValue(new Error('Not Found'));
    const mockFile = vi.fn().mockReturnValue({
      setMetadata: mockSetMetadata,
    });
    const mockBucket = vi.fn().mockReturnValue({
      file: mockFile,
    });

    const mockStorageClient = {
      bucket: mockBucket,
    };

    (apiClientFactory.getStorageClient as vi.Mock).mockReturnValue(mockStorageClient);

    const metadata = { contentType: 'application/json' };
    const result = await updateObjectMetadata({
      bucket_name: 'test-bucket',
      object_name: 'test-object',
      metadata,
    });

    expect(result.content).toEqual([
      {
        type: 'text',
        text: JSON.stringify({
          error: 'Error updating object metadata: Not Found',
          error_type: 'NotFound',
        }),
      },
    ]);
  });

  it('should return a "Forbidden" error if the user does not have permission', async () => {
    const mockSetMetadata = vi.fn().mockRejectedValue(new Error('Forbidden'));
    const mockFile = vi.fn().mockReturnValue({
      setMetadata: mockSetMetadata,
    });
    const mockBucket = vi.fn().mockReturnValue({
      file: mockFile,
    });

    const mockStorageClient = {
      bucket: mockBucket,
    };

    (apiClientFactory.getStorageClient as vi.Mock).mockReturnValue(mockStorageClient);

    const metadata = { contentType: 'application/json' };
    const result = await updateObjectMetadata({
      bucket_name: 'test-bucket',
      object_name: 'test-object',
      metadata,
    });

    expect(result.content).toEqual([
      {
        type: 'text',
        text: JSON.stringify({
          error: 'Error updating object metadata: Forbidden',
          error_type: 'Forbidden',
        }),
      },
    ]);
  });

  it('should return a "BadRequest" error if the request is invalid', async () => {
    const mockSetMetadata = vi.fn().mockRejectedValue(new Error('Invalid'));
    const mockFile = vi.fn().mockReturnValue({
      setMetadata: mockSetMetadata,
    });
    const mockBucket = vi.fn().mockReturnValue({
      file: mockFile,
    });

    const mockStorageClient = {
      bucket: mockBucket,
    };

    (apiClientFactory.getStorageClient as vi.Mock).mockReturnValue(mockStorageClient);

    const metadata = { contentType: 'application/json' };
    const result = await updateObjectMetadata({
      bucket_name: 'test-bucket',
      object_name: 'test-object',
      metadata,
    });

    expect(result.content).toEqual([
      {
        type: 'text',
        text: JSON.stringify({
          error: 'Error updating object metadata: Invalid',
          error_type: 'BadRequest',
        }),
      },
    ]);
  });
});

describe('registerUpdateObjectMetadataTool', () => {
  it('should register the update_object_metadata tool with the server', () => {
    const mockServer = new McpServer();
    registerUpdateObjectMetadataTool(mockServer);

    expect(mockServer.registerTool).toHaveBeenCalledWith(
      'update_object_metadata',
      expect.any(Object),
      updateObjectMetadata,
    );
  });
});
