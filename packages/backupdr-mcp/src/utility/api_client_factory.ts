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

import { BackupDRClient } from '@google-cloud/backupdr';
import { DisksClient, InstancesClient } from '@google-cloud/compute';
import { SqlInstancesServiceClient, SqlOperationsServiceClient } from '@google-cloud/sql';

export class ApiClientFactory {
  private static instance: ApiClientFactory;
  private backupDRClient?: BackupDRClient;
  private csqlClient?: SqlInstancesServiceClient;
  private sqlOperationsClient?: SqlOperationsServiceClient;
  private computeClient?: InstancesClient;
  private disksClient?: DisksClient;

  private constructor() {}

  static getInstance(): ApiClientFactory {
    if (!ApiClientFactory.instance) {
      ApiClientFactory.instance = new ApiClientFactory();
    }
    return ApiClientFactory.instance;
  }

  getBackupDRClient(): BackupDRClient {
    if (!this.backupDRClient) {
      this.backupDRClient = new BackupDRClient();
    }
    return this.backupDRClient;
  }
  getCloudSQLClient(): SqlInstancesServiceClient {
    if (!this.csqlClient) {
      this.csqlClient = new SqlInstancesServiceClient({
        fallback: 'rest',
      });
    }
    return this.csqlClient;
  }
  getSqlOperationsClient(): SqlOperationsServiceClient {
    if (!this.sqlOperationsClient) {
      this.sqlOperationsClient = new SqlOperationsServiceClient({
        fallback: 'rest',
      });
    }
    return this.sqlOperationsClient;
  }
  getComputeClient(): InstancesClient {
    if (!this.computeClient) {
      this.computeClient = new InstancesClient({
        fallback: 'rest',
      });
    }
    return this.computeClient;
  }
  getDisksClient(): DisksClient {
    if (!this.disksClient) {
      this.disksClient = new DisksClient({
        fallback: 'rest',
      });
    }
    return this.disksClient;
  }
}

export const apiClientFactory = ApiClientFactory.getInstance();
