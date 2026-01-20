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

import { GoogleAuth, type AuthClient } from 'google-auth-library';

// Interface for the API parameters
export interface ListResourceBackupConfigsParams {
  projectId: string;
  location: string;
  pageSize?: number;
  pageToken?: string;
  filter?: string;
  orderBy?: string;
}

export class GoogleCloudHTTPClient {
  private auth: GoogleAuth;
  private client: AuthClient | null = null;

  constructor() {
    this.auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
  }

  /**
   * Lazily initializes and returns the authenticated HTTP client.
   */
  private async getAuthClient(): Promise<AuthClient> {
    if (!this.client) {
      this.client = await this.auth.getClient();
    }
    return this.client;
  }

  /**
   * Lists resource backup configurations from the BackupDR API.
   */
  async listResourceBackupConfigs(params: ListResourceBackupConfigsParams) {
    const { projectId, location, pageSize, pageToken, filter, orderBy } = params;
    const client = await this.getAuthClient();

    // Construct API URL
    const parent = `projects/${projectId}/locations/${location}`;
    const url = `https://backupdr.googleapis.com/v1/${parent}/resourceBackupConfigs`;

    const response = await client.request({
      url,
      method: 'GET',
      params: {
        pageSize,
        pageToken,
        filter,
        orderBy,
      },
    });

    return response.data;
  }

  /**
   * Restores a Cloud SQL backup to a Cloud SQL instance.
   */
  async csqlRestore(project: string, restoreInstanceName: string, backupdrBackupName: string) {
    const client = await this.getAuthClient();
    const url = `https://sqladmin.googleapis.com/sql/v1beta4/projects/${project}/instances/${restoreInstanceName}/restoreBackup?alt=json`;

    const response = await client.request({
      url,
      method: 'POST',
      data: {
        backupdrBackup: backupdrBackupName,
      },
    });

    return response.data;
  }
}

// Export a singleton instance to be used across the application
export const googleCloudHttpClient = new GoogleCloudHTTPClient();
