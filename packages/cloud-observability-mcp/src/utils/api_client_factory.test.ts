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
import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';
import { ApiClientFactory as ApiClientFactoryClass } from './api_client_factory.js';

// Mock the googleapis library
vi.mock('googleapis', () => ({
  google: {
    monitoring: vi.fn(() => ({})),
    logging: vi.fn(() => ({})),
    clouderrorreporting: vi.fn(() => ({})),
    cloudtrace: vi.fn(() => ({})),
  },
}));

// Mock the google-auth-library
vi.mock('google-auth-library');

describe('ApiClientFactory', () => {
  let ApiClientFactory: typeof ApiClientFactoryClass;

  beforeEach(async () => {
    // Reset mocks and the module cache before each test
    vi.resetModules();
    vi.clearAllMocks();
    // Re-import the module to get a fresh instance
    ApiClientFactory = (await import('./api_client_factory.js')).ApiClientFactory;
  });

  it('should use the correct auth scopes on initialization', () => {
    ApiClientFactory.getInstance();
    expect(GoogleAuth).toHaveBeenCalledWith({
      scopes: 'https://www.googleapis.com/auth/cloud-platform',
    });
  });

  it('should always return the same singleton instance', () => {
    const instance1 = ApiClientFactory.getInstance();
    const instance2 = ApiClientFactory.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should create and cache the monitoring client', () => {
    const factory = ApiClientFactory.getInstance();
    const client1 = factory.getMonitoringClient();
    const client2 = factory.getMonitoringClient();
    expect(client1).toBe(client2);
    expect(google.monitoring).toHaveBeenCalledTimes(1);
  });

  it('should create and cache the logging client', () => {
    const factory = ApiClientFactory.getInstance();
    const client1 = factory.getLoggingClient();
    const client2 = factory.getLoggingClient();
    expect(client1).toBe(client2);
    expect(google.logging).toHaveBeenCalledTimes(1);
  });

  it('should create and cache the error reporting client', () => {
    const factory = ApiClientFactory.getInstance();
    const client1 = factory.getErrorReportingClient();
    const client2 = factory.getErrorReportingClient();
    expect(client1).toBe(client2);
    expect(google.clouderrorreporting).toHaveBeenCalledTimes(1);
  });

  it('should create and cache the trace client', () => {
    const factory = ApiClientFactory.getInstance();
    const client1 = factory.getTraceClient();
    const client2 = factory.getTraceClient();
    expect(client1).toBe(client2);
    expect(google.cloudtrace).toHaveBeenCalledTimes(1);
  });
});
