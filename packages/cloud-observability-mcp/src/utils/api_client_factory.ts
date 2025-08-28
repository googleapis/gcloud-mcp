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

import {
  Auth,
  clouderrorreporting_v1beta1,
  logging_v2,
  monitoring_v3,
  cloudtrace_v1,
  google,
} from 'googleapis';
import { GoogleAuth } from 'google-auth-library';

export class ApiClientFactory {
  private static instance: ApiClientFactory;
  private readonly auth: Auth.GoogleAuth;
  private monitoringClient?: monitoring_v3.Monitoring;
  private loggingClient?: logging_v2.Logging;
  private errorReportingClient?: clouderrorreporting_v1beta1.Clouderrorreporting;
  private traceClient?: cloudtrace_v1.Cloudtrace;

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

  getMonitoringClient(): monitoring_v3.Monitoring {
    if (!this.monitoringClient) {
      this.monitoringClient = google.monitoring({
        version: 'v3',
        auth: this.auth,
      });
    }
    return this.monitoringClient;
  }

  getLoggingClient(): logging_v2.Logging {
    if (!this.loggingClient) {
      this.loggingClient = google.logging({
        version: 'v2',
        auth: this.auth,
      });
    }
    return this.loggingClient;
  }

  getErrorReportingClient(): clouderrorreporting_v1beta1.Clouderrorreporting {
    if (!this.errorReportingClient) {
      this.errorReportingClient = google.clouderrorreporting({
        version: 'v1beta1',
        auth: this.auth,
      });
    }
    return this.errorReportingClient;
  }

  getTraceClient(): cloudtrace_v1.Cloudtrace {
    if (!this.traceClient) {
      this.traceClient = google.cloudtrace({
        version: 'v1',
        auth: this.auth,
      });
    }
    return this.traceClient;
  }
}

export const apiClientFactory = ApiClientFactory.getInstance();
