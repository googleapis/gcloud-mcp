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
import { uploadObjectSafe, registerUploadObjectSafeTool } from './upload_object_safe.js';
import { apiClientFactory } from '../../utility/index.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as fs from 'fs';
import { getContentType } from '../../utility/gcs_helpers.js';

vi.mock('fs');
vi.mock('../../utility/gcs_helpers.js');
vi.mock('../../utility/index.js');
vi.mock('@modelcontextprotocol/sdk/server/mcp.js');

describe('uploadObjectSafe', () => {
  it('should upload a new object and return a success message', async () => {
    const mockSave = vi.fn().mockResolvedValue(undefined);
    const mockFile = vi.fn().mockReturnValue({
      save: mockSave,
      getMetadata: vi.fn().mockResolvedValue([
        {
          size: 123,
          contentType: 'text/plain',
        },
      ]),
    });
    const mockBucket = vi.fn().mockReturnValue({
      file: mockFile,
    });

    const mockStorageClient = {
      bucket: mockBucket,
    };

    (apiClientFactory.getStorageClient as vi.Mock).mockReturnValue(mockStorageClient);
    (fs.existsSync as vi.Mock).mockReturnValue(true);
    (getContentType as vi.Mock).mockReturnValue('text/plain');

    const result = await uploadObjectSafe({
      bucket_name: 'test-bucket',
      file_path: '/path/to/file',
      object_name: 'test-object',
    });

    expect(apiClientFactory.getStorageClient).toHaveBeenCalled();
    expect(mockBucket).toHaveBeenCalledWith('test-bucket');
    expect(mockFile).toHaveBeenCalledWith('test-object', { generation: 0 });
    expect(mockSave).toHaveBeenCalledWith(fs.readFileSync('/path/to/file'), {
      contentType: 'text/plain',
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

  it('should return an "AlreadyExists" error if the object already exists', async () => {
    const mockError = {
      message: 'condition not met',
      code: 412,
    };
    const mockSave = vi.fn().mockRejectedValue(mockError);
    const mockFile = vi.fn().mockReturnValue({
      save: mockSave,
    });
    const mockBucket = vi.fn().mockReturnValue({
      file: mockFile,
    });

    const mockStorageClient = {
      bucket: mockBucket,
    };

    (apiClientFactory.getStorageClient as vi.Mock).mockReturnValue(mockStorageClient);
    (fs.existsSync as vi.Mock).mockReturnValue(true);

    const result = await uploadObjectSafe({
      bucket_name: 'test-bucket',
      file_path: '/path/to/file',
      object_name: 'test-object',
    });

    expect(result.content).toEqual([
      {
        type: 'text',
        text: JSON.stringify({
          error: 'Error uploading file: condition not met',
          error_type: 'AlreadyExists',
        }),
      },
    ]);
  });

  it('should return a "NotFound" error if the file does not exist', async () => {
    (fs.existsSync as vi.Mock).mockReturnValue(false);

    const result = await uploadObjectSafe({
      bucket_name: 'test-bucket',
      file_path: '/path/to/nonexistent/file',
    });

    expect(result.content).toEqual([
      {
        type: 'text',
        text: JSON.stringify({
          error: 'File not found at path: /path/to/nonexistent/file',
          error_type: 'NotFound',
        }),
      },
    ]);
  });
});

describe('registerUploadObjectSafeTool', () => {
  it('should register the upload_object_safe tool with the server', () => {
    const mockServer = new McpServer();
    registerUploadObjectSafeTool(mockServer);

    expect(mockServer.registerTool).toHaveBeenCalledWith(
      'upload_object_safe',
      expect.any(Object),
      uploadObjectSafe,
    );
  });
});
