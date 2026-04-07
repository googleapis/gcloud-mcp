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

import { vi, describe, it, expect, afterEach } from 'vitest';
import { downloadObjectSafe, registerDownloadObjectSafeTool } from './download_object_safe';
import { apiClientFactory } from '../../utility/index.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

vi.mock('../../utility/index.js');
vi.mock('@modelcontextprotocol/sdk/server/mcp.js');
vi.mock('fs');

describe('downloadObjectSafe', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should download an object and return success when destination does not exist', async () => {
    const { default: fs } = await import('fs');
    (fs.existsSync as vi.Mock).mockReturnValue(false);

    const mockDownload = vi.fn().mockResolvedValue(undefined);
    const mockFile = vi.fn(() => ({
      download: mockDownload,
    }));
    const mockBucket = vi.fn(() => ({
      file: mockFile,
    }));
    const mockStorageClient = {
      bucket: mockBucket,
    };

    (apiClientFactory.getStorageClient as vi.Mock).mockReturnValue(mockStorageClient);

    const result = await downloadObjectSafe({
      bucket_name: 'test-bucket',
      object_name: 'test-object.txt',
      file_path: '/tmp/test-object.txt',
    });

    expect(fs.existsSync).toHaveBeenCalledWith('/tmp/test-object.txt');
    expect(apiClientFactory.getStorageClient).toHaveBeenCalled();
    expect(mockBucket).toHaveBeenCalledWith('test-bucket');
    expect(mockFile).toHaveBeenCalledWith('test-object.txt');
    expect(mockDownload).toHaveBeenCalledWith({ destination: '/tmp/test-object.txt' });
    const resultText = JSON.parse(result.content[0].text as string);
    expect(resultText.success).toBe(true);
  });

  it('should return AlreadyExists error when destination file already exists', async () => {
    const { default: fs } = await import('fs');
    (fs.existsSync as vi.Mock).mockReturnValue(true);

    const result = await downloadObjectSafe({
      bucket_name: 'test-bucket',
      object_name: 'test-object.txt',
      file_path: '/tmp/test-object.txt',
    });

    expect(apiClientFactory.getStorageClient).not.toHaveBeenCalled();
    const resultText = JSON.parse(result.content[0].text as string);
    expect(resultText.success).toBe(false);
    expect(resultText.error_type).toBe('AlreadyExists');
    expect(resultText.error).toContain('/tmp/test-object.txt');
  });

  it('should return an error if the download fails', async () => {
    const { default: fs } = await import('fs');
    (fs.existsSync as vi.Mock).mockReturnValue(false);

    const mockDownload = vi.fn().mockRejectedValue(new Error('Download failed'));
    const mockFile = vi.fn(() => ({
      download: mockDownload,
    }));
    const mockBucket = vi.fn(() => ({
      file: mockFile,
    }));
    const mockStorageClient = {
      bucket: mockBucket,
    };

    (apiClientFactory.getStorageClient as vi.Mock).mockReturnValue(mockStorageClient);

    const result = await downloadObjectSafe({
      bucket_name: 'test-bucket',
      object_name: 'test-object.txt',
      file_path: '/tmp/test-object.txt',
    });

    const resultText = JSON.parse(result.content[0].text as string);
    expect(resultText.success).toBe(false);
    expect(resultText.error).toBe('Download failed');
  });
});

describe('registerDownloadObjectSafeTool', () => {
  it('should register the download_object_safe tool with the server', () => {
    const mockServer = new McpServer();
    registerDownloadObjectSafeTool(mockServer);

    expect(mockServer.registerTool).toHaveBeenCalledWith(
      'download_object_safe',
      expect.any(Object),
      downloadObjectSafe,
    );
  });
});
