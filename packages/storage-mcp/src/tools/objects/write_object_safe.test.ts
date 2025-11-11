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
import { writeObjectSafe, registerWriteObjectSafeTool } from './write_object_safe.js';
import { apiClientFactory } from '../../utility/index.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getContentType, validateBase64Content } from '../../utility/gcs_helpers.js';

vi.mock('../../utility/gcs_helpers.js');
vi.mock('../../utility/index.js');
vi.mock('@modelcontextprotocol/sdk/server/mcp.js');

describe('writeObjectSafe', () => {
  it('should write content to a new object and return a success message', async () => {
    const mockSave = vi.fn().mockResolvedValue(undefined);
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
    (getContentType as vi.Mock).mockReturnValue('text/plain');
    (validateBase64Content as vi.Mock).mockReturnValue(undefined);

    const content = Buffer.from('file content').toString('base64');
    const result = await writeObjectSafe({
      bucket_name: 'test-bucket',
      object_name: 'test-object',
      content,
    });

    expect(apiClientFactory.getStorageClient).toHaveBeenCalled();
    expect(mockBucket).toHaveBeenCalledWith('test-bucket');
    expect(mockFile).toHaveBeenCalledWith('test-object', { generation: 0 });
    expect(mockSave).toHaveBeenCalledWith(Buffer.from(content, 'base64'), {
      contentType: 'text/plain',
    });
    const expectedJson = {
      success: true,
      message: 'Object test-object written successfully to bucket test-bucket',
      bucket: 'test-bucket',
      object: 'test-object',
      size: 12,
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
    (validateBase64Content as vi.Mock).mockReturnValue(undefined);

    const content = Buffer.from('file content').toString('base64');
    const result = await writeObjectSafe({
      bucket_name: 'test-bucket',
      object_name: 'test-object',
      content,
    });

    expect(result.content).toEqual([
      {
        type: 'text',
        text: JSON.stringify({
          error: 'Error writing object: condition not met',
          error_type: 'AlreadyExists',
        }),
      },
    ]);
  });
  it('should return an "InvalidContent" error if the content is not valid base64', async () => {
    const mockError = new Error('Content is not a valid base64 string.');
    (validateBase64Content as vi.Mock).mockImplementation(() => {
      throw mockError;
    });

    const result = await writeObjectSafe({
      bucket_name: 'test-bucket',
      object_name: 'test-object',
      // The '!' character is not a valid base64 character and should trigger the error.
      content: 'Hello, World!',
    });

    expect(result.content).toEqual([
      {
        type: 'text',
        text: JSON.stringify({
          error: 'Content is not a valid base64 string.',
          error_type: 'InvalidInput',
        }),
      },
    ]);
  });

  it('should return a "NotFound" error if the bucket or object is not found (404)', async () => {
    const mockError = { message: 'Not Found', code: 404 };
    const mockSave = vi.fn().mockRejectedValue(mockError);
    const mockFile = vi.fn().mockReturnValue({ save: mockSave });
    const mockBucket = vi.fn().mockReturnValue({ file: mockFile });
    const mockStorageClient = { bucket: mockBucket };

    (apiClientFactory.getStorageClient as vi.Mock).mockReturnValue(mockStorageClient);
    (validateBase64Content as vi.Mock).mockReturnValue(undefined);

    const content = Buffer.from('file content').toString('base64');
    const result = await writeObjectSafe({
      bucket_name: 'non-existent-bucket',
      object_name: 'test-object',
      content,
    });

    expect(result.content).toEqual([
      {
        type: 'text',
        text: JSON.stringify({
          error: 'Error writing object: Not Found',
          error_type: 'NotFound',
        }),
      },
    ]);
  });

  it('should return a "Forbidden" error if permissions are insufficient (403)', async () => {
    const mockError = { message: 'Forbidden', code: 403 };
    const mockSave = vi.fn().mockRejectedValue(mockError);
    const mockFile = vi.fn().mockReturnValue({ save: mockSave });
    const mockBucket = vi.fn().mockReturnValue({ file: mockFile });
    const mockStorageClient = { bucket: mockBucket };

    (apiClientFactory.getStorageClient as vi.Mock).mockReturnValue(mockStorageClient);
    (validateBase64Content as vi.Mock).mockReturnValue(undefined);

    const content = Buffer.from('file content').toString('base64');
    const result = await writeObjectSafe({
      bucket_name: 'forbidden-bucket',
      object_name: 'test-object',
      content,
    });

    expect(result.content).toEqual([
      {
        type: 'text',
        text: JSON.stringify({
          error: 'Error writing object: Forbidden',
          error_type: 'Forbidden',
        }),
      },
    ]);
  });

  it('should return a "BadRequest" error for invalid requests (400)', async () => {
    const mockError = { message: 'Bad Request', code: 400 };
    const mockSave = vi.fn().mockRejectedValue(mockError);
    const mockFile = vi.fn().mockReturnValue({ save: mockSave });
    const mockBucket = vi.fn().mockReturnValue({ file: mockFile });
    const mockStorageClient = { bucket: mockBucket };

    (apiClientFactory.getStorageClient as vi.Mock).mockReturnValue(mockStorageClient);
    (validateBase64Content as vi.Mock).mockReturnValue(undefined);

    const content = Buffer.from('file content').toString('base64');
    const result = await writeObjectSafe({
      bucket_name: 'invalid-bucket-name',
      object_name: 'test-object',
      content,
    });

    expect(result.content).toEqual([
      {
        type: 'text',
        text: JSON.stringify({
          error: 'Error writing object: Bad Request',
          error_type: 'BadRequest',
        }),
      },
    ]);
  });
});

describe('registerWriteObjectSafeTool', () => {
  it('should register the write_object_safe tool with the server', () => {
    const mockServer = new McpServer();
    registerWriteObjectSafeTool(mockServer);

    expect(mockServer.registerTool).toHaveBeenCalledWith(
      'write_object_safe',
      expect.any(Object),
      writeObjectSafe,
    );
  });
});
