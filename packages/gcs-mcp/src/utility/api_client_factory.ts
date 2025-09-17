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

import { Auth, google, storage_v1 } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';

export class ApiClientFactory {
  private static instance: ApiClientFactory;
  private readonly auth: Auth.GoogleAuth;
  private storageClient?: storage_v1.Storage;

  private constructor() {
    this.auth = new GoogleAuth({
      scopes: 'https://www.googleapis.com/auth/cloud-platform',
    });
  }

  static getInstance(): ApiClientFactory {
    if (!ApiClientFactory.instance) {
      ApiClientFactory.instance = new ApiClientFactory();
    }
    return ApiClientFactory.instance;
  }

  getStorageClient(): storage_v1.Storage {
    if (!this.storageClient) {
      this.storageClient = google.storage({
        version: 'v1',
        auth: this.auth,
      });
    }
    return this.storageClient;
  }
}

export const apiClientFactory = ApiClientFactory.getInstance();
