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
import { describe, it, expect, vi, Mock } from 'vitest';
import { listBackupPlans, registerListBackupPlansTool } from './list_backup_plans.js';
import { apiClientFactory } from '../../utility/api_client_factory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

vi.mock('../../utility/api_client_factory.js');
vi.mock('@modelcontextprotocol/sdk/server/mcp.js');

describe('listBackupPlans', () => {
  it('should return a list of backup plans', async () => {
    const mockPlans = [{ name: 'plan-1' }, { name: 'plan-2' }];
    const mockListBackupPlans = vi.fn().mockResolvedValue([mockPlans]);
    const mockBackupDRClient = {
      listBackupPlans: mockListBackupPlans,
    };

    (apiClientFactory.getBackupDRClient as Mock).mockReturnValue(mockBackupDRClient);

    const result = await listBackupPlans({ project_id: 'test-project', location: 'us-central1' });

    expect(apiClientFactory.getBackupDRClient).toHaveBeenCalled();
    expect(mockListBackupPlans).toHaveBeenCalledWith({
      parent: 'projects/test-project/locations/us-central1',
    });
    expect(result.content).toEqual([{ type: 'text', text: JSON.stringify(mockPlans, null, 2) }]);
  });

  it('should return an empty list if no plans are found', async () => {
    const mockListBackupPlans = vi.fn().mockResolvedValue([[]]);
    const mockBackupDRClient = {
      listBackupPlans: mockListBackupPlans,
    };

    (apiClientFactory.getBackupDRClient as Mock).mockReturnValue(mockBackupDRClient);

    const result = await listBackupPlans({ project_id: 'test-project', location: 'us-central1' });

    expect(result.content).toEqual([{ type: 'text', text: '[]' }]);
  });

  it('should handle errors gracefully', async () => {
    const errorMessage = 'API Error';
    const mockListBackupPlans = vi.fn().mockRejectedValue(new Error(errorMessage));
    const mockBackupDRClient = {
      listBackupPlans: mockListBackupPlans,
    };

    (apiClientFactory.getBackupDRClient as Mock).mockReturnValue(mockBackupDRClient);

    const result = await listBackupPlans({ project_id: 'test-project', location: 'us-central1' });

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

describe('registerListBackupPlansTool', () => {
  it('should register the list_backup_plans tool with the server', () => {
    const mockServer = {
      registerTool: vi.fn(),
    } as unknown as McpServer;
    registerListBackupPlansTool(mockServer);

    expect(mockServer.registerTool).toHaveBeenCalledWith(
      'list_backup_plans',
      expect.any(Object),
      listBackupPlans,
    );
  });
});
