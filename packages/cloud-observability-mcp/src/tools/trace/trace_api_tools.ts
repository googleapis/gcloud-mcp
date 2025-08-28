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

import { apiClientFactory } from '../../utils/api_client_factory.js';

const trace = apiClientFactory.getTraceClient();

/**
 * Lists traces from the Google Cloud Trace API.
 * @param projectId The Google Cloud project ID.
 * @param filter The filter to apply when listing traces.
 * @param orderBy The sorting order for the results.
 * @param pageSize The maximum number of traces to return.
 * @param pageToken If present, then retrieve the next batch of results.
 * @param startTime The start of the time interval.
 * @param endTime The end of the time interval.
 * @returns A promise that resolves with a string containing the traces in JSON
 *     format, or an error message.
 */
export async function listTraces(
  projectId: string,
  filter?: string,
  orderBy?: string,
  pageSize?: number,
  pageToken?: string,
  startTime?: string,
  endTime?: string,
): Promise<string> {
  const request = {
    projectId,
    filter,
    orderBy,
    pageSize,
    pageToken,
    startTime,
    endTime,
    // Always set to `ROOTSPAN`, `MINIMAL` isn't useful and `COMPLETE` can overwhelm the agents.
    view: 'ROOTSPAN',
  };

  try {
    const response = await trace.projects.traces.list(request);
    return JSON.stringify(response.data.traces || [], null, 2);
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Failed to list traces: ${error.message}`);
    }
    throw new Error('An unknown error occurred while listing traces.');
  }
}

/**
 * Retrieves a single trace from the Google Cloud Trace API.
 * @param projectId Required. The Google Cloud project ID.
 * @param traceId Required. The ID of the trace to retrieve.
 * @returns A promise that resolves with a string containing the trace in JSON
 *     format, or an error message.
 */
export async function getTrace(projectId: string, traceId: string): Promise<string> {
  const request = {
    projectId,
    traceId,
  };

  try {
    const response = await trace.projects.traces.get(request);
    return JSON.stringify(response.data || {}, null, 2);
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Failed to get trace: ${error.message}`);
    }
    throw new Error('An unknown error occurred while getting the trace.');
  }
}
