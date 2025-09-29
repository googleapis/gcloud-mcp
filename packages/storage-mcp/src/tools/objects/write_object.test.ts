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
import { writeObject, registerWriteObjectTool } from './write_object.js';
import { apiClientFactory } from '../../utility/index.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

vi.mock('../../utility/index.js');
vi.mock('@modelcontextprotocol/sdk/server/mcp.js');

import { getContentType, validateBase64Content } from '../../utility/gcs_helpers.js';

vi.mock('../../utility/gcs_helpers.js');
vi.mock('../../utility/index.js');
vi.mock('@modelcontextprotocol/sdk/server/mcp.js');

describe('writeObject', () => {
  it('should write content to an object and return a success message', async () => {
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
    const result = await writeObject({
      bucket_name: 'test-bucket',
      object_name: 'test-object',
      content,
    });

    expect(apiClientFactory.getStorageClient).toHaveBeenCalled();
    expect(mockBucket).toHaveBeenCalledWith('test-bucket');
    expect(mockFile).toHaveBeenCalledWith('test-object');
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

  it('should return a "Not Found" error if the bucket does not exist', async () => {
    const mockSave = vi.fn().mockRejectedValue(new Error('Not Found'));
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
    const result = await writeObject({
      bucket_name: 'test-bucket',
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

  it('should return a "Forbidden" error if the user does not have permission', async () => {
    const mockSave = vi.fn().mockRejectedValue(new Error('Forbidden'));
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
    const result = await writeObject({
      bucket_name: 'test-bucket',
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

  it('should return a "BadRequest" error if the request is invalid', async () => {
    const mockSave = vi.fn().mockRejectedValue(new Error('Invalid'));
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
    const result = await writeObject({
      bucket_name: 'test-bucket',
      object_name: 'test-object',
      content,
    });

    expect(result.content).toEqual([
      {
        type: 'text',
        text: JSON.stringify({
          error: 'Error writing object: Invalid',
          error_type: 'BadRequest',
        }),
      },
    ]);
  });

  it('should return an "InvalidInput" error if the content is not valid base64', async () => {
    (validateBase64Content as vi.Mock).mockImplementation(() => {
      throw new Error('Invalid base64 content');
    });

    const result = await writeObject({
      bucket_name: 'test-bucket',
      object_name: 'test-object',
      content: 'invalid content',
    });

    expect(result.content).toEqual([
      {
        type: 'text',
        text: JSON.stringify({
          error: 'Invalid base64 content',
          error_type: 'InvalidInput',
        }),
      },
    ]);
  });
});

describe('registerWriteObjectTool', () => {
  it('should register the write_object tool with the server', () => {
    const mockServer = new McpServer();
    registerWriteObjectTool(mockServer);

    expect(mockServer.registerTool).toHaveBeenCalledWith(
      'write_object',
      expect.any(Object),
      writeObject,
    );
  });
});
