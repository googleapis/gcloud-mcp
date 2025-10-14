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

import { Storage } from '@google-cloud/storage';
import { ServiceUsageClient } from '@google-cloud/service-usage';
import { StorageInsightsClient } from '@google-cloud/storageinsights';

export class ApiClientFactory {
  private static instance: ApiClientFactory;
  private storageClient?: Storage;
  private serviceUsageClient?: ServiceUsageClient;
  private storageInsightsClient?: StorageInsightsClient;

  private constructor() {}

  static getInstance(): ApiClientFactory {
    if (!ApiClientFactory.instance) {
      ApiClientFactory.instance = new ApiClientFactory();
    }
    return ApiClientFactory.instance;
  }

  getStorageClient(): Storage {
    if (!this.storageClient) {
      this.storageClient = new Storage();
    }
    return this.storageClient;
  }

  getServiceUsageClient(): ServiceUsageClient {
    if (!this.serviceUsageClient) {
      this.serviceUsageClient = new ServiceUsageClient();
    }
    return this.serviceUsageClient;
  }

  getStorageInsightsClient(): StorageInsightsClient {
    if (!this.storageInsightsClient) {
      this.storageInsightsClient = new StorageInsightsClient();
    }
    return this.storageInsightsClient;
  }
}

export const apiClientFactory = ApiClientFactory.getInstance();
