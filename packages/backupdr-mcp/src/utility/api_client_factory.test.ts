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

import { test, expect, vi, describe, beforeEach, afterEach } from 'vitest';
import { BackupDRClient } from '@google-cloud/backupdr';

vi.mock('@google-cloud/backupdr');

describe('ApiClientFactory', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('getInstance should return a singleton instance', async () => {
    const { ApiClientFactory: ApiClientFactory1 } = await import('./api_client_factory.js');
    const { ApiClientFactory: ApiClientFactory2 } = await import('./api_client_factory.js');
    const instance1 = ApiClientFactory1.getInstance();
    const instance2 = ApiClientFactory2.getInstance();
    expect(instance1).toBe(instance2);
  });

  test('getBackupDRClient should return a BackupDRClient instance', async () => {
    const { apiClientFactory } = await import('./api_client_factory.js');
    const client = apiClientFactory.getBackupDRClient();
    expect(client).toBeInstanceOf(BackupDRClient);
  });

  test('getBackupDRClient should return a singleton client instance', async () => {
    const { apiClientFactory } = await import('./api_client_factory.js');
    const client1 = apiClientFactory.getBackupDRClient();
    const client2 = apiClientFactory.getBackupDRClient();
    expect(client1).toBe(client2);
    expect(BackupDRClient).toHaveBeenCalledTimes(1);
  });
});
