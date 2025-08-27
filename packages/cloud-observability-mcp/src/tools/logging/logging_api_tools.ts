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

const logging = apiClientFactory.getLoggingClient();

/**
 * Lists log entries from the Google Cloud Logging API.
 * @param resourceNames The resource names to search for log entries (e.g.,
 *     `['projects/my-project']`).
 * @param filter The logging filter to apply.
 * @param orderBy How the results should be sorted.
 * @param pageSize The maximum number of results to return from this request.
 * @param pageToken If present, then retrieve the next batch of results.
 * @returns A promise that resolves with a string containing the log entries in
 *     JSON format, or an error message.
 */
export async function listLogEntries(
  resourceNames: string[],
  filter?: string,
  orderBy: 'timestamp asc' | 'timestamp desc' = 'timestamp asc',
  pageSize = 50,
  pageToken?: string
): Promise<string> {
  const request = {
    requestBody: {
      resourceNames,
      filter,
      orderBy,
      pageSize,
      pageToken,
    },
  };

  try {
    const response = await logging.entries.list(request);
    return JSON.stringify(response.data.entries || [], null, 2);
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Failed to list log entries: ${error.message}`);
    }
    throw new Error('An unknown error occurred while listing log entries.');
  }
}

/**
 * Lists log names from the Google Cloud Logging API.
 * @param parent The parent resource whose logs are to be listed.
 * @param pageSize The maximum number of results to return from this request.
 * @param pageToken If present, then retrieve the next batch of results.
 * @returns A promise that resolves with a string containing the log names in
 *     JSON format, or an error message.
 */
export async function listLogNames(
  parent: string,
  pageSize?: number,
  pageToken?: string
): Promise<string> {
  const request = {
    parent,
    pageSize,
    pageToken,
  };

  try {
    const response = await logging.projects.logs.list(request);
    return JSON.stringify(response.data.logNames || [], null, 2);
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Failed to list log names: ${error.message}`);
    }
    throw new Error('An unknown error occurred while listing log names.');
  }
}

/**
 * Lists log buckets from the Google Cloud Logging API.
 * @param parent The parent resource whose buckets are to be listed.
 * @param pageSize The maximum number of results to return from this request.
 * @param pageToken If present, then retrieve the next batch of results.
 * @returns A promise that resolves with a string containing the log buckets in
 *     JSON format, or an error message.
 */
export async function listBuckets(
  parent: string,
  pageSize?: number,
  pageToken?: string
): Promise<string> {
  const request = {
    parent,
    pageSize,
    pageToken,
  };

  try {
    const response = await logging.projects.locations.buckets.list(request);
    return JSON.stringify(response.data.buckets || [], null, 2);
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Failed to list log buckets: ${error.message}`);
    }
    throw new Error('An unknown error occurred while listing log buckets.');
  }
}

/**
 * Lists log views from the Google Cloud Logging API.
 * @param parent The parent resource whose views are to be listed.
 * @param pageSize The maximum number of results to return from this request.
 * @param pageToken If present, then retrieve the next batch of results.
 * @returns A promise that resolves with a string containing the log views in
 *     JSON format, or an error message.
 */
export async function listViews(
  parent: string,
  pageSize?: number,
  pageToken?: string
): Promise<string> {
  const request = {
    parent,
    pageSize,
    pageToken,
  };

  try {
    const response =
      await logging.projects.locations.buckets.views.list(request);
    return JSON.stringify(response.data.views || [], null, 2);
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Failed to list log views: ${error.message}`);
    }
    throw new Error('An unknown error occurred while listing log views.');
  }
}

/**
 * Lists log sinks from the Google Cloud Logging API.
 * @param parent The parent resource whose sinks are to be listed.
 * @param pageSize The maximum number of results to return from this request.
 * @param pageToken If present, then retrieve the next batch of results.
 * @returns A promise that resolves with a string containing the log sinks in
 *     JSON format, or an error message.
 */
export async function listSinks(
  parent: string,
  pageSize?: number,
  pageToken?: string
): Promise<string> {
  const request = {
    parent,
    pageSize,
    pageToken,
  };

  try {
    const response = await logging.projects.sinks.list(request);
    return JSON.stringify(response.data.sinks || [], null, 2);
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Failed to list log sinks: ${error.message}`);
    }
    throw new Error('An unknown error occurred while listing log sinks.');
  }
}

/**
 * Lists log scopes from the Google Cloud Logging API.
 * @param parent The parent resource whose log scopes are to be listed.
 * @param pageSize The maximum number of results to return from this request.
 * @param pageToken If present, then retrieve the next batch of results.
 * @returns A promise that resolves with a string containing the log scopes in
 *     JSON format, or an error message.
 */
export async function listLogScopes(
  parent: string,
  pageSize?: number,
  pageToken?: string
): Promise<string> {
  const request = {
    parent,
    pageSize,
    pageToken,
  };

  try {
    const response = await logging.projects.locations.logScopes.list(request);
    return JSON.stringify(response.data.logScopes || [], null, 2);
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Failed to list log scopes: ${error.message}`);
    }
    throw new Error('An unknown error occurred while listing log scopes.');
  }
}