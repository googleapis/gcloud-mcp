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
import { generateSignedUrl, registerGenerateSignedUrlTool } from './generate_signed_url';
import { apiClientFactory } from '../../utility/index.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

vi.mock('../../utility/index.js');
vi.mock('@modelcontextprotocol/sdk/server/mcp.js');

const mockStorageClient = (getSignedUrl: ReturnType<typeof vi.fn>) => {
  const mockFile = vi.fn(() => ({ getSignedUrl }));
  const mockBucket = vi.fn(() => ({ file: mockFile }));
  (apiClientFactory.getStorageClient as vi.Mock).mockReturnValue({ bucket: mockBucket });
  return { mockBucket, mockFile };
};

describe('generateSignedUrl', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should generate a signed URL with the default expiration', async () => {
    const getSignedUrl = vi.fn().mockResolvedValue(['https://signed-url.example.com']);
    const { mockBucket, mockFile } = mockStorageClient(getSignedUrl);
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);

    const result = await generateSignedUrl({
      bucket_name: 'test-bucket',
      object_name: 'test-object.txt',
    });

    expect(apiClientFactory.getStorageClient).toHaveBeenCalled();
    expect(mockBucket).toHaveBeenCalledWith('test-bucket');
    expect(mockFile).toHaveBeenCalledWith('test-object.txt');
    expect(getSignedUrl).toHaveBeenCalledWith({
      version: 'v4',
      action: 'read',
      expires: new Date(now + 60 * 60 * 1000),
    });
    const resultText = JSON.parse(result.content[0].text as string);
    expect(resultText.signed_url).toBe('https://signed-url.example.com');
    expect(resultText.expiration_minutes).toBe(60);
  });

  it('should generate a signed URL with a custom expiration', async () => {
    const getSignedUrl = vi.fn().mockResolvedValue(['https://signed-url.example.com']);
    mockStorageClient(getSignedUrl);
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);

    const result = await generateSignedUrl({
      bucket_name: 'test-bucket',
      object_name: 'test-object.txt',
      expiration_minutes: 30,
    });

    expect(getSignedUrl).toHaveBeenCalledWith({
      version: 'v4',
      action: 'read',
      expires: new Date(now + 30 * 60 * 1000),
    });
    const resultText = JSON.parse(result.content[0].text as string);
    expect(resultText.expiration_minutes).toBe(30);
  });

  it('should return an error if signed URL generation fails', async () => {
    const getSignedUrl = vi.fn().mockRejectedValue(new Error('Signing failed'));
    mockStorageClient(getSignedUrl);

    const result = await generateSignedUrl({
      bucket_name: 'test-bucket',
      object_name: 'test-object.txt',
    });

    const resultText = JSON.parse(result.content[0].text as string);
    expect(resultText.error).toContain('Signing failed');
  });
});

describe('registerGenerateSignedUrlTool', () => {
  it('should register the generate_signed_url tool with the server', () => {
    const mockServer = new McpServer();
    registerGenerateSignedUrlTool(mockServer);

    expect(mockServer.registerTool).toHaveBeenCalledWith(
      'generate_signed_url',
      expect.any(Object),
      generateSignedUrl,
    );
  });
});
