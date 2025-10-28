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
import { createBucket, registerCreateBucketTool } from './create_bucket.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

vi.mock('../../utility/index.js');
vi.mock('@modelcontextprotocol/sdk/server/mcp.js');

import { Storage } from '@google-cloud/storage';

vi.mock('@google-cloud/storage');
vi.mock('../../utility/index.js');
vi.mock('@modelcontextprotocol/sdk/server/mcp.js');

describe('createBucket', () => {
  it('should create a bucket and return a success message', async () => {
    const mockBucket = {
      getMetadata: vi.fn().mockResolvedValue([{ name: 'test-bucket' }]),
    };
    const mockCreateBucket = vi.fn().mockResolvedValue([mockBucket]);
    const mockStorage = {
      createBucket: mockCreateBucket,
    };
    (Storage as vi.Mock).mockImplementation(() => mockStorage);

    const result = await createBucket({
      project_id: 'test-project',
      bucket_name: 'test-bucket',
      location: 'US',
    });

    expect(Storage).toHaveBeenCalledWith({ projectId: 'test-project' });
    expect(mockCreateBucket).toHaveBeenCalledWith('test-bucket', {
      location: 'US',
      requesterPays: false,
      storageClass: 'STANDARD',
      versioning: { enabled: false },
    });
    expect(mockBucket.getMetadata).toHaveBeenCalled();
    const expectedJson = {
      success: true,
      message: 'Bucket test-bucket created successfully in project test-project',
      bucket: { name: 'test-bucket' },
    };
    expect(result.content).toEqual([
      {
        type: 'text',
        text: JSON.stringify(expectedJson),
      },
    ]);
  });

  it('should create a bucket with labels and return a success message', async () => {
    const mockBucket = {
      getMetadata: vi.fn().mockResolvedValue([{ name: 'test-bucket', labels: { test: 'label' } }]),
    };
    const mockCreateBucket = vi.fn().mockResolvedValue([mockBucket]);
    const mockStorage = {
      createBucket: mockCreateBucket,
    };
    (Storage as vi.Mock).mockImplementation(() => mockStorage);

    const result = await createBucket({
      project_id: 'test-project',
      bucket_name: 'test-bucket',
      location: 'US',
      labels: { test: 'label' },
    });

    expect(Storage).toHaveBeenCalledWith({ projectId: 'test-project' });
    expect(mockCreateBucket).toHaveBeenCalledWith('test-bucket', {
      location: 'US',
      requesterPays: false,
      storageClass: 'STANDARD',
      versioning: { enabled: false },
      labels: { test: 'label' },
    });
    expect(mockBucket.getMetadata).toHaveBeenCalled();
    const expectedJson = {
      success: true,
      message: 'Bucket test-bucket created successfully in project test-project',
      bucket: { name: 'test-bucket', labels: { test: 'label' } },
    };
    expect(result.content).toEqual([
      {
        type: 'text',
        text: JSON.stringify(expectedJson),
      },
    ]);
  });

  it('should return a "Conflict" error if the bucket already exists', async () => {
    const mockCreateBucket = vi.fn().mockRejectedValue(new Error('already exists'));
    const mockStorage = {
      createBucket: mockCreateBucket,
    };
    (Storage as vi.Mock).mockImplementation(() => mockStorage);

    const result = await createBucket({
      project_id: 'test-project',
      bucket_name: 'test-bucket',
      location: 'US',
    });

    expect(result.content).toEqual([
      {
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: 'Error creating bucket: already exists',
          error_type: 'Conflict',
        }),
      },
    ]);
  });

  it('should return a "Not Found" error if the project does not exist', async () => {
    const mockCreateBucket = vi.fn().mockRejectedValue(new Error('Not Found'));
    const mockStorage = {
      createBucket: mockCreateBucket,
    };
    (Storage as vi.Mock).mockImplementation(() => mockStorage);

    const result = await createBucket({
      project_id: 'test-project',
      bucket_name: 'test-bucket',
      location: 'US',
    });

    expect(result.content).toEqual([
      {
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: 'Error creating bucket: Not Found',
          error_type: 'NotFound',
        }),
      },
    ]);
  });

  it('should return a "Forbidden" error if the user does not have permission', async () => {
    const mockCreateBucket = vi.fn().mockRejectedValue(new Error('Forbidden'));
    const mockStorage = {
      createBucket: mockCreateBucket,
    };
    (Storage as vi.Mock).mockImplementation(() => mockStorage);

    const result = await createBucket({
      project_id: 'test-project',
      bucket_name: 'test-bucket',
      location: 'US',
    });

    expect(result.content).toEqual([
      {
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: 'Error creating bucket: Forbidden',
          error_type: 'Forbidden',
        }),
      },
    ]);
  });

  it('should return a "BadRequest" error if the request is invalid', async () => {
    const mockCreateBucket = vi.fn().mockRejectedValue(new Error('Invalid'));
    const mockStorage = {
      createBucket: mockCreateBucket,
    };
    (Storage as vi.Mock).mockImplementation(() => mockStorage);

    const result = await createBucket({
      project_id: 'test-project',
      bucket_name: 'test-bucket',
      location: 'US',
    });

    expect(result.content).toEqual([
      {
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: 'Error creating bucket: Invalid',
          error_type: 'BadRequest',
        }),
      },
    ]);
  });
});

describe('registerCreateBucketTool', () => {
  it('should register the create_bucket tool with the server', () => {
    const mockServer = new McpServer();
    registerCreateBucketTool(mockServer);

    expect(mockServer.registerTool).toHaveBeenCalledWith(
      'create_bucket',
      expect.any(Object),
      createBucket,
    );
  });
});
