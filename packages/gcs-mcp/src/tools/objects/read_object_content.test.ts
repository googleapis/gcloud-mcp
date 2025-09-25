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
import { readObjectContent, registerReadObjectContentTool } from './read_object_content.js';
import { apiClientFactory } from '../../utility/index.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

vi.mock('../../utility/index.js');
vi.mock('../../utility/logger.js');

describe('readObjectContent', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return the content of an object', async () => {
    const mockContent = 'file content';
    const mockDownload = vi.fn().mockResolvedValue([Buffer.from(mockContent)]);
    const mockGet = vi.fn().mockResolvedValue([
      {
        metadata: {
          size: mockContent.length,
          contentType: 'text/plain',
        },
      },
    ]);
    const mockFile = vi.fn().mockReturnValue({
      download: mockDownload,
      get: mockGet,
    });
    const mockBucket = vi.fn().mockReturnValue({
      file: mockFile,
    });

    const mockStorageClient = {
      bucket: mockBucket,
    };

    (apiClientFactory.getStorageClient as vi.Mock).mockReturnValue(mockStorageClient);

    const result = await readObjectContent({
      bucket_name: 'test-bucket',
      object_name: 'test-object',
    });

    expect(apiClientFactory.getStorageClient).toHaveBeenCalled();
    expect(mockBucket).toHaveBeenCalledWith('test-bucket');
    expect(mockFile).toHaveBeenCalledWith('test-object');
    expect(mockDownload).toHaveBeenCalled();
    const expectedJson = {
      bucket: 'test-bucket',
      object: 'test-object',
      size: mockContent.length,
      content_type: 'text/plain',
      content: mockContent,
    };
    expect(result.content).toEqual([
      {
        type: 'text',
        text: JSON.stringify(expectedJson, null, 2),
      },
    ]);
  });

  it('should return a "Not Found" error if the object does not exist', async () => {
    const mockDownload = vi.fn().mockRejectedValue(new Error('Not Found'));
    const mockGet = vi.fn().mockResolvedValue([
      {
        metadata: {
          size: 123,
          contentType: 'text/plain',
        },
      },
    ]);
    const mockFile = vi.fn().mockReturnValue({
      download: mockDownload,
      get: mockGet,
    });
    const mockBucket = vi.fn().mockReturnValue({
      file: mockFile,
    });

    const mockStorageClient = {
      bucket: mockBucket,
    };

    (apiClientFactory.getStorageClient as vi.Mock).mockReturnValue(mockStorageClient);

    const result = await readObjectContent({
      bucket_name: 'test-bucket',
      object_name: 'test-object',
    });

    expect(result.content).toEqual([
      {
        type: 'text',
        text: JSON.stringify({
          error: 'Error reading object content: Not Found',
          error_type: 'NotFound',
        }),
      },
    ]);
  });

  it('should return a "Forbidden" error if the user does not have permission', async () => {
    const mockDownload = vi.fn().mockRejectedValue(new Error('Forbidden'));
    const mockGet = vi.fn().mockResolvedValue([
      {
        metadata: {
          size: 123,
          contentType: 'text/plain',
        },
      },
    ]);
    const mockFile = vi.fn().mockReturnValue({
      download: mockDownload,
      get: mockGet,
    });
    const mockBucket = vi.fn().mockReturnValue({
      file: mockFile,
    });

    const mockStorageClient = {
      bucket: mockBucket,
    };

    (apiClientFactory.getStorageClient as vi.Mock).mockReturnValue(mockStorageClient);

    const result = await readObjectContent({
      bucket_name: 'test-bucket',
      object_name: 'test-object',
    });

    expect(result.content).toEqual([
      {
        type: 'text',
        text: JSON.stringify({
          error: 'Error reading object content: Forbidden',
          error_type: 'Forbidden',
        }),
      },
    ]);
  });

  it('should return a "ContentTooLarge" error if the object is too large', async () => {
    const mockGet = vi.fn().mockResolvedValue([
      {
        metadata: {
          size: 100000001,
          contentType: 'text/plain',
        },
      },
    ]);
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

    const result = await readObjectContent({
      bucket_name: 'test-bucket',
      object_name: 'test-object',
    });

    expect(result.content).toEqual([
      {
        type: 'text',
        text: JSON.stringify({
          error:
            'Object test-object is too large (100000001 bytes) to read into memory. Maximum size is 20971520 bytes.',
          error_type: 'ContentTooLarge',
        }),
      },
    ]);
  });

  it('should return the content of a supported non-text object', async () => {
    const mockContent = 'file content';
    const mockDownload = vi.fn().mockResolvedValue([Buffer.from(mockContent)]);
    const mockGet = vi.fn().mockResolvedValue([
      {
        metadata: {
          size: mockContent.length,
          contentType: 'image/png',
        },
      },
    ]);
    const mockFile = vi.fn().mockReturnValue({
      download: mockDownload,
      get: mockGet,
    });
    const mockBucket = vi.fn().mockReturnValue({
      file: mockFile,
    });

    const mockStorageClient = {
      bucket: mockBucket,
    };

    (apiClientFactory.getStorageClient as vi.Mock).mockReturnValue(mockStorageClient);

    const result = await readObjectContent({
      bucket_name: 'test-bucket',
      object_name: 'test-object',
    });

    expect(result.content).toEqual([
      {
        message: `Successfully read raw content for object test-object (${mockContent.length} bytes)`,
        type: 'resource',
        resource: {
          uri: 'gcs://test-bucket/test-object',
          mimeType: 'image/png',
          blob: Buffer.from(mockContent).toString('base64'),
        },
      },
    ]);
  });

  it('should return an "UnsupportedContentType" error for unsupported non-text objects', async () => {
    const mockContent = 'file content';
    const mockDownload = vi.fn().mockResolvedValue([Buffer.from(mockContent)]);
    const mockGet = vi.fn().mockResolvedValue([
      {
        metadata: {
          size: mockContent.length,
          contentType: 'application/octet-stream',
        },
      },
    ]);
    const mockFile = vi.fn().mockReturnValue({
      download: mockDownload,
      get: mockGet,
    });
    const mockBucket = vi.fn().mockReturnValue({
      file: mockFile,
    });

    const mockStorageClient = {
      bucket: mockBucket,
    };

    (apiClientFactory.getStorageClient as vi.Mock).mockReturnValue(mockStorageClient);

    const result = await readObjectContent({
      bucket_name: 'test-bucket',
      object_name: 'test-object',
    });

    expect(result.content).toEqual([
      {
        type: 'text',
        text: JSON.stringify({
          error: 'Unsupported content type: application/octet-stream.',
          error_type: 'UnsupportedContentType',
        }),
      },
    ]);
  });

  it('should return raw content if text decoding fails', async () => {
    const mockContent = Buffer.from([0xff, 0xfe, 0xfd]);
    const mockDownload = vi.fn().mockResolvedValue([mockContent]);
    const mockGet = vi.fn().mockResolvedValue([
      {
        metadata: {
          size: mockContent.length,
          contentType: 'text/plain',
        },
      },
    ]);
    const mockFile = vi.fn().mockReturnValue({
      download: mockDownload,
      get: mockGet,
    });
    const mockBucket = vi.fn().mockReturnValue({
      file: mockFile,
    });

    const mockStorageClient = {
      bucket: mockBucket,
    };

    (apiClientFactory.getStorageClient as vi.Mock).mockReturnValue(mockStorageClient);

    const result = await readObjectContent({
      bucket_name: 'test-bucket',
      object_name: 'test-object',
    });

    const expectedJson = {
      bucket: 'test-bucket',
      object: 'test-object',
      size: mockContent.length,
      content_type: 'text/plain',
      content: '���',
    };

    expect(result.content).toEqual([
      {
        type: 'text',
        text: JSON.stringify(expectedJson, null, 2),
      },
    ]);
  });

  it('should handle large files under the streaming threshold', async () => {
    const mockContent = 'a'.repeat(5000001);
    const mockDownload = vi.fn().mockResolvedValue([Buffer.from(mockContent)]);
    const mockGet = vi.fn().mockResolvedValue([
      {
        metadata: {
          size: mockContent.length,
          contentType: 'text/plain',
        },
      },
    ]);
    const mockFile = vi.fn().mockReturnValue({
      download: mockDownload,
      get: mockGet,
    });
    const mockBucket = vi.fn().mockReturnValue({
      file: mockFile,
    });

    const mockStorageClient = {
      bucket: mockBucket,
    };

    (apiClientFactory.getStorageClient as vi.Mock).mockReturnValue(mockStorageClient);

    const result = await readObjectContent({
      bucket_name: 'test-bucket',
      object_name: 'test-object',
    });

    const expectedJson = {
      bucket: 'test-bucket',
      object: 'test-object',
      size: mockContent.length,
      content_type: 'text/plain',
      content: mockContent,
    };
    expect(result.content).toEqual([
      {
        type: 'text',
        text: JSON.stringify(expectedJson, null, 2),
      },
    ]);
  });

  it('should log a warning for large files over the streaming threshold', async () => {
    const mockContent = 'a'.repeat(10 * 1024 * 1024 + 1);
    const mockDownload = vi.fn().mockResolvedValue([Buffer.from(mockContent)]);
    const mockGet = vi.fn().mockResolvedValue([
      {
        metadata: {
          size: mockContent.length,
          contentType: 'text/plain',
        },
      },
    ]);
    const mockFile = vi.fn().mockReturnValue({
      download: mockDownload,
      get: mockGet,
    });
    const mockBucket = vi.fn().mockReturnValue({
      file: mockFile,
    });

    const mockStorageClient = {
      bucket: mockBucket,
    };

    (apiClientFactory.getStorageClient as vi.Mock).mockReturnValue(mockStorageClient);

    const { logger } = await import('../../utility/logger.js');
    const loggerSpy = vi.spyOn(logger, 'warn');

    await readObjectContent({
      bucket_name: 'test-bucket',
      object_name: 'test-object',
    });

    expect(loggerSpy).toHaveBeenCalledWith(
      `Object test-object is large (${mockContent.length} bytes). Consider using streaming for better performance.`,
    );
  });
});

describe('registerReadObjectContentTool', () => {
  it('should register the read_object_content tool with the server', () => {
    const mockServer = {
      registerTool: vi.fn(),
    };
    registerReadObjectContentTool(mockServer as unknown as McpServer);

    expect(mockServer.registerTool).toHaveBeenCalledWith(
      'read_object_content',
      expect.any(Object),
      readObjectContent,
    );
  });
});
