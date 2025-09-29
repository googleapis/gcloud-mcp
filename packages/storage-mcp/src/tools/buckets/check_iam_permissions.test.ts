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
import { checkIamPermissions, registerCheckIamPermissionsTool } from './check_iam_permissions.js';
import { apiClientFactory } from '../../utility/index.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

vi.mock('../../utility/index.js');
vi.mock('@modelcontextprotocol/sdk/server/mcp.js');

describe('checkIamPermissions', () => {
  it('should return the permissions a user has on a bucket', async () => {
    const mockPermissions = ['storage.objects.list', 'storage.objects.get'];
    const mockTestIamPermissions = vi.fn().mockResolvedValue([mockPermissions]);
    const mockBucket = {
      iam: {
        testPermissions: mockTestIamPermissions,
      },
    };

    const mockStorageClient = {
      bucket: vi.fn().mockReturnValue(mockBucket),
    };

    (apiClientFactory.getStorageClient as vi.Mock).mockReturnValue(mockStorageClient);

    const result = await checkIamPermissions({
      bucket_name: 'test-bucket',
      permissions: ['storage.objects.list', 'storage.objects.get'],
    });

    expect(apiClientFactory.getStorageClient).toHaveBeenCalled();
    expect(mockStorageClient.bucket).toHaveBeenCalledWith('test-bucket');
    expect(mockTestIamPermissions).toHaveBeenCalledWith([
      'storage.objects.list',
      'storage.objects.get',
    ]);
    const expectedJson = {
      bucket_name: 'test-bucket',
      requested_permissions: ['storage.objects.list', 'storage.objects.get'],
      allowed_permissions: ['storage.objects.list', 'storage.objects.get'],
      denied_permissions: [],
    };
    expect(result.content).toEqual([
      {
        type: 'text',
        text: JSON.stringify(expectedJson, null, 2),
      },
    ]);
  });

  it('should return a message if the user has no permissions', async () => {
    const mockTestIamPermissions = vi.fn().mockResolvedValue([[]]);
    const mockBucket = {
      iam: {
        testPermissions: mockTestIamPermissions,
      },
    };

    const mockStorageClient = {
      bucket: vi.fn().mockReturnValue(mockBucket),
    };

    (apiClientFactory.getStorageClient as vi.Mock).mockReturnValue(mockStorageClient);

    const result = await checkIamPermissions({
      bucket_name: 'test-bucket',
      permissions: ['storage.objects.list'],
    });

    const expectedJson = {
      bucket_name: 'test-bucket',
      requested_permissions: ['storage.objects.list'],
      allowed_permissions: [],
      denied_permissions: ['storage.objects.list'],
    };
    expect(result.content).toEqual([
      {
        type: 'text',
        text: JSON.stringify(expectedJson, null, 2),
      },
    ]);
  });

  it('should return a "Not Found" error if the bucket does not exist', async () => {
    const mockTestIamPermissions = vi.fn().mockRejectedValue(new Error('Not Found'));
    const mockBucket = {
      iam: {
        testPermissions: mockTestIamPermissions,
      },
    };

    const mockStorageClient = {
      bucket: vi.fn().mockReturnValue(mockBucket),
    };

    (apiClientFactory.getStorageClient as vi.Mock).mockReturnValue(mockStorageClient);

    const result = await checkIamPermissions({
      bucket_name: 'test-bucket',
      permissions: ['storage.objects.list'],
    });

    expect(result.content).toEqual([
      {
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: 'Error testing IAM permissions: Not Found',
          error_type: 'NotFound',
        }),
      },
    ]);
  });

  it('should return a "Forbidden" error if the user does not have permission', async () => {
    const mockTestIamPermissions = vi.fn().mockRejectedValue(new Error('Forbidden'));
    const mockBucket = {
      iam: {
        testPermissions: mockTestIamPermissions,
      },
    };

    const mockStorageClient = {
      bucket: vi.fn().mockReturnValue(mockBucket),
    };

    (apiClientFactory.getStorageClient as vi.Mock).mockReturnValue(mockStorageClient);

    const result = await checkIamPermissions({
      bucket_name: 'test-bucket',
      permissions: ['storage.objects.list'],
    });

    expect(result.content).toEqual([
      {
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: 'Error testing IAM permissions: Forbidden',
          error_type: 'Forbidden',
        }),
      },
    ]);
  });
});

describe('registerCheckIamPermissionsTool', () => {
  it('should register the check_iam_permissions tool with the server', () => {
    const mockServer = new McpServer();
    registerCheckIamPermissionsTool(mockServer);

    expect(mockServer.registerTool).toHaveBeenCalledWith(
      'check_iam_permissions',
      expect.any(Object),
      checkIamPermissions,
    );
  });
});
