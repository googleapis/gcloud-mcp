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

const errorReporting = apiClientFactory.getErrorReportingClient();

/**
 * Lists group stats from the Google Cloud Error Reporting API.
 * @param projectName The resource name of the Google Cloud Platform project.
 * @param timeRangePeriod The time range to query, e.g. PERIOD_1_HOUR.
 * @param order The sort order in which the results are returned.
 * @param pageSize The maximum number of results to return per response.
 * @param pageToken A page token from a previous response.
 * @returns A promise that resolves with a string containing the group stats in
 *     JSON format, or an error message.
 */
export async function listGroupStats(
  projectName: string,
  timeRangePeriod?: string,
  order?: string,
  pageSize?: number,
  pageToken?: string,
): Promise<string> {
  const request = {
    projectName,
    ...(timeRangePeriod && { 'timeRange.period': timeRangePeriod }),
    order,
    pageSize,
    pageToken,
  };

  try {
    const response = await errorReporting.projects.groupStats.list(request);
    return JSON.stringify(response.data.errorGroupStats || [], null, 2);
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Failed to list group stats: ${error.message}`);
    }
    throw new Error('An unknown error occurred while listing group stats.');
  }
}
