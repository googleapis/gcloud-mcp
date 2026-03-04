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

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { triggerBackup, registerTriggerBackupTool } from './trigger_backup.js';
import { apiClientFactory } from '../../utility/api_client_factory.js';

vi.mock('../../utility/api_client_factory.js', () => ({
  apiClientFactory: {
    getBackupDRClient: vi.fn(),
  },
}));

describe('trigger_backup tool', () => {
  const mockBackupDRClient = {
    triggerBackup: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (apiClientFactory.getBackupDRClient as Mock).mockReturnValue(mockBackupDRClient);
  });

  it('should trigger a backup successfully', async () => {
    const mockResponse = { name: 'operation-123' };
    const mockOperation = {
      latestResponse: mockResponse,
    };
    mockBackupDRClient.triggerBackup.mockResolvedValue([mockOperation]);

    const params = {
      project_id: 'test-project',
      location: 'us-central1',
      backup_plan_association_id: 'assoc-1',
      backup_rule_id: 'rule-1',
    };

    const result = await triggerBackup(params);

    expect(mockBackupDRClient.triggerBackup).toHaveBeenCalledWith({
      name: 'projects/test-project/locations/us-central1/backupPlanAssociations/assoc-1',
      ruleId: 'rule-1',
    });
    const content = result.content as Array<{ type: string; text: string }>;
    expect(content![0]!.type).toBe('text');
    expect(JSON.parse(content![0]!.text)).toEqual(mockResponse);
  });

  it('should handle errors', async () => {
    const errorMessage = 'API error';
    mockBackupDRClient.triggerBackup.mockRejectedValue(new Error(errorMessage));

    const params = {
      project_id: 'test-project',
      location: 'us-central1',
      backup_plan_association_id: 'assoc-1',
      backup_rule_id: 'rule-1',
    };

    const result = await triggerBackup(params);

    const content = result.content as Array<{ type: string; text: string }>;
    expect(content![0]!.type).toBe('text');
    expect(JSON.parse(content![0]!.text)).toEqual({ error: errorMessage });
  });

  it('should register the trigger_backup tool with the server', () => {
    const server = new McpServer(
      { name: 'test', version: '1.0.0' },
      { capabilities: { tools: {} } },
    );
    const registerToolSpy = vi.spyOn(server, 'registerTool');

    registerTriggerBackupTool(server);

    expect(registerToolSpy).toHaveBeenCalledWith(
      'trigger_backup',
      expect.any(Object),
      expect.any(Function),
    );
  });
});
