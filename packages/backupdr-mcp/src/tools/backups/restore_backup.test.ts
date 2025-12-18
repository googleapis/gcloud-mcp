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
import { describe, it, expect, vi, Mock, beforeEach } from 'vitest';
import { restoreBackup, registerRestoreBackupTool } from './restore_backup.js';
import { apiClientFactory } from '../../utility/api_client_factory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

vi.mock('../../utility/api_client_factory.js');
vi.mock('@modelcontextprotocol/sdk/server/mcp.js');

describe('restoreBackup', () => {
  const mockRestoreBackup = vi.fn();
  const mockBackupDRClient = {
    restoreBackup: mockRestoreBackup,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (apiClientFactory.getBackupDRClient as Mock).mockReturnValue(mockBackupDRClient);
  });

  const baseValidArgs = {
    name: 'projects/p1/locations/l1/backupVaults/bv1/dataSources/ds1/backups/b1',
  };

  it('should successfully initiate and complete a restore operation for a Compute Instance', async () => {
    const args = {
      ...baseValidArgs,
      computeInstanceTargetEnvironment: {
        project: 'target-project',
        zone: 'us-central1-a',
      },
      computeInstanceRestoreProperties: {
        name: 'restored-instance',
        machineType: 'n1-standard-1',
      },
    };

    const mockPromise = vi.fn().mockResolvedValue(undefined);
    const mockOperation = {
      name: 'projects/p1/locations/l1/operations/op1',
      metadata: {},
      promise: mockPromise,
    };
    const expectedOperationResult = {
      name: 'projects/p1/locations/l1/operations/op1',
      metadata: {},
    };

    mockRestoreBackup.mockResolvedValue([mockOperation]);

    const result = await restoreBackup(args);

    expect(mockRestoreBackup).toHaveBeenCalledWith({
      name: args.name,
      requestId: null,
      computeInstanceTargetEnvironment: {
        project: 'target-project',
        zone: 'us-central1-a',
      },
      diskTargetEnvironment: null,
      regionDiskTargetEnvironment: null,
      computeInstanceRestoreProperties: {
        name: 'restored-instance',
        machineType: 'n1-standard-1',
        description: null,
        canIpForward: null,
        confidentialInstanceConfig: null,
        deletionProtection: null,
        disks: null,
        displayDevice: null,
        guestAccelerators: null,
        labels: null,
        metadata: null,
        minCpuPlatform: null,
        networkInterfaces: null,
        scheduling: null,
        serviceAccounts: null,
        tags: null,
        advancedMachineFeatures: null,
      },
      diskRestoreProperties: null,
    });
    expect(mockPromise).toHaveBeenCalled();

    expect(result.content).toEqual([
      { type: 'text', text: JSON.stringify(expectedOperationResult, null, 2) },
    ]);
  });

  it('should successfully initiate and complete a restore operation for a Disk', async () => {
    const args = {
      ...baseValidArgs,
      diskTargetEnvironment: {
        project: 'target-project',
        zone: 'us-central1-a',
      },
      diskRestoreProperties: {
        name: 'restored-disk',
        labels: { env: 'prod' },
      },
    };

    const mockPromise = vi.fn().mockResolvedValue(undefined);
    const mockOperation = {
      name: 'projects/p1/locations/l1/operations/op2',
      metadata: {},
      promise: mockPromise,
    };

    const expectedOperationResult = {
      name: 'projects/p1/locations/l1/operations/op2',
      metadata: {},
    };

    mockRestoreBackup.mockResolvedValue([mockOperation]);

    const result = await restoreBackup(args);

    expect(mockRestoreBackup).toHaveBeenCalledWith({
      name: args.name,
      requestId: null,
      computeInstanceTargetEnvironment: null,
      diskTargetEnvironment: {
        project: 'target-project',
        zone: 'us-central1-a',
      },
      regionDiskTargetEnvironment: null,
      computeInstanceRestoreProperties: null,
      diskRestoreProperties: {
        name: 'restored-disk',
        labels: { env: 'prod' },
        description: null,
        resourceManagerTags: null,
        diskEncryptionKey: null,
        provisionedIops: null,
        provisionedThroughput: null,
      },
    });

    expect(mockPromise).toHaveBeenCalled();
    expect(result.content).toEqual([
      { type: 'text', text: JSON.stringify(expectedOperationResult, null, 2) },
    ]);
  });

  it('should handle errors during restore', async () => {
    const errorMessage = 'Permission denied';
    mockRestoreBackup.mockRejectedValue(new Error(errorMessage));

    const result = await restoreBackup(baseValidArgs);

    expect(result.content).toEqual([
      {
        type: 'text',
        text: JSON.stringify({
          error: errorMessage,
        }),
      },
    ]);
  });
});

describe('registerRestoreBackupTool', () => {
  it('should register the restore_backup tool with the server', () => {
    const mockServer = {
      registerTool: vi.fn(),
    } as unknown as McpServer;
    registerRestoreBackupTool(mockServer);

    expect(mockServer.registerTool).toHaveBeenCalledWith(
      'restore_backup',
      expect.any(Object),
      restoreBackup,
    );
  });
});
