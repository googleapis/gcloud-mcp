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

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Storage } from '@google-cloud/storage';
import { ApiClientFactory as ApiClientFactoryClass } from './api_client_factory.js';

// Mock the @google-cloud/storage library
vi.mock('@google-cloud/storage');

describe('ApiClientFactory', () => {
  let ApiClientFactory: typeof ApiClientFactoryClass;

  beforeEach(async () => {
    // Reset mocks and the module cache before each test
    vi.resetModules();
    vi.clearAllMocks();
    // Re-import the module to get a fresh instance
    ApiClientFactory = (await import('./api_client_factory.js')).ApiClientFactory;
  });

  it('should always return the same singleton instance', () => {
    const instance1 = ApiClientFactory.getInstance();
    const instance2 = ApiClientFactory.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should create and cache the storage client', () => {
    const factory = ApiClientFactory.getInstance();
    const client1 = factory.getStorageClient();
    const client2 = factory.getStorageClient();
    expect(client1).toBe(client2);
    expect(Storage).toHaveBeenCalledTimes(1);
  });
});
