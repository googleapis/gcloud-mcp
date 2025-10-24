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
import { uploadObject, registerUploadObjectTool } from './upload_object.js';
import { apiClientFactory } from '../../utility/index.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

vi.mock('../../utility/index.js');
vi.mock('@modelcontextprotocol/sdk/server/mcp.js');

import * as fs from 'fs';
import { getContentType } from '../../utility/gcs_helpers.js';

vi.mock('fs');
vi.mock('../../utility/gcs_helpers.js');
vi.mock('../../utility/index.js');
vi.mock('@modelcontextprotocol/sdk/server/mcp.js');

describe('uploadObject', () => {
  it('should upload an object and return a success message', async () => {
    const mockUpload = vi.fn().mockResolvedValue([
      {
        getMetadata: vi.fn().mockResolvedValue([
          {
            size: 123,
            contentType: 'text/plain',
          },
        ]),
      },
    ]);
    const mockBucket = vi.fn().mockReturnValue({
      upload: mockUpload,
    });

    const mockStorageClient = {
      bucket: mockBucket,
    };

    (apiClientFactory.getStorageClient as vi.Mock).mockReturnValue(mockStorageClient);
    (fs.existsSync as vi.Mock).mockReturnValue(true);
    (getContentType as vi.Mock).mockReturnValue('text/plain');

    const result = await uploadObject({
      bucket_name: 'test-bucket',
      file_path: '/path/to/file',
      object_name: 'test-object',
    });

    expect(apiClientFactory.getStorageClient).toHaveBeenCalled();
    expect(mockBucket).toHaveBeenCalledWith('test-bucket');
    expect(mockUpload).toHaveBeenCalledWith('/path/to/file', {
      destination: 'test-object',
      metadata: { contentType: 'text/plain' },
    });
    const expectedJson = {
      success: true,
      message: 'File /path/to/file uploaded successfully to gs://test-bucket/test-object',
      bucket: 'test-bucket',
      object: 'test-object',
      size: 123,
      content_type: 'text/plain',
    };
    expect(result.content).toEqual([
      {
        type: 'text',
        text: JSON.stringify(expectedJson, null, 2),
      },
    ]);
  });

  it('should return a "FileNotFound" error if the file does not exist', async () => {
    (fs.existsSync as vi.Mock).mockReturnValue(false);

    const result = await uploadObject({
      bucket_name: 'test-bucket',
      file_path: '/path/to/file',
      object_name: 'test-object',
    });

    expect(result.content).toEqual([
      {
        type: 'text',
        text: JSON.stringify({
          error: 'File not found at path: /path/to/file',
          error_type: 'FileNotFound',
        }),
      },
    ]);
  });

  it('should return a "Not Found" error if the bucket does not exist', async () => {
    const mockUpload = vi.fn().mockRejectedValue(new Error('Not Found'));
    const mockBucket = vi.fn().mockReturnValue({
      upload: mockUpload,
    });

    const mockStorageClient = {
      bucket: mockBucket,
    };

    (apiClientFactory.getStorageClient as vi.Mock).mockReturnValue(mockStorageClient);
    (fs.existsSync as vi.Mock).mockReturnValue(true);

    const result = await uploadObject({
      bucket_name: 'test-bucket',
      file_path: '/path/to/file',
      object_name: 'test-object',
    });

    expect(result.content).toEqual([
      {
        type: 'text',
        text: JSON.stringify({
          error: 'Error uploading file: Not Found',
          error_type: 'NotFound',
        }),
      },
    ]);
  });

  it('should return a "Forbidden" error if the user does not have permission', async () => {
    const mockUpload = vi.fn().mockRejectedValue(new Error('Forbidden'));
    const mockBucket = vi.fn().mockReturnValue({
      upload: mockUpload,
    });

    const mockStorageClient = {
      bucket: mockBucket,
    };

    (apiClientFactory.getStorageClient as vi.Mock).mockReturnValue(mockStorageClient);
    (fs.existsSync as vi.Mock).mockReturnValue(true);

    const result = await uploadObject({
      bucket_name: 'test-bucket',
      file_path: '/path/to/file',
      object_name: 'test-object',
    });

    expect(result.content).toEqual([
      {
        type: 'text',
        text: JSON.stringify({
          error: 'Error uploading file: Forbidden',
          error_type: 'Forbidden',
        }),
      },
    ]);
  });

  it('should return a "BadRequest" error if the request is invalid', async () => {
    const mockUpload = vi.fn().mockRejectedValue(new Error('Invalid'));
    const mockBucket = vi.fn().mockReturnValue({
      upload: mockUpload,
    });

    const mockStorageClient = {
      bucket: mockBucket,
    };

    (apiClientFactory.getStorageClient as vi.Mock).mockReturnValue(mockStorageClient);
    (fs.existsSync as vi.Mock).mockReturnValue(true);

    const result = await uploadObject({
      bucket_name: 'test-bucket',
      file_path: '/path/to/file',
      object_name: 'test-object',
    });

    expect(result.content).toEqual([
      {
        type: 'text',
        text: JSON.stringify({
          error: 'Error uploading file: Invalid',
          error_type: 'BadRequest',
        }),
      },
    ]);
  });
});

describe('registerUploadObjectTool', () => {
  it('should register the upload_object tool with the server', () => {
    const mockServer = new McpServer();
    registerUploadObjectTool(mockServer);

    expect(mockServer.registerTool).toHaveBeenCalledWith(
      'upload_object',
      expect.any(Object),
      uploadObject,
    );
  });
});
