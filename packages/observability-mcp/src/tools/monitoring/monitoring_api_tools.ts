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

const monitoring = apiClientFactory.getMonitoringClient();

/**
 * Lists metric descriptors from the Google Cloud Monitoring API.
 * @param name The project on which to execute the request.
 * @param filter The filter to apply when listing metric descriptors.
 * @param activeOnly If true, only metrics with recent data are included.
 * @param pageSize The maximum number of results to return.
 * @param pageToken If present, then retrieve the next batch of results.
 * @returns A promise that resolves with a string containing the metric
 *     descriptors in JSON format, or an error message.
 */
export async function listMetricDescriptors(
  name: string,
  filter?: string,
  pageSize?: number,
  pageToken?: string,
): Promise<string> {
  const request = {
    name,
    filter,
    pageSize,
    pageToken,
  };

  try {
    const response = await monitoring.projects.metricDescriptors.list(request);
    return JSON.stringify(response.data.metricDescriptors || [], null, 2);
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Failed to list metric descriptors: ${error.message}`);
    }
    throw new Error('An unknown error occurred while listing metric descriptors.');
  }
}

interface Aggregation {
  alignmentPeriod?: string;
  perSeriesAligner?: string;
}

/**
 * Lists time series data from the Google Cloud Monitoring API.
 * @param name The project on which to execute the request.
 * @param filter The filter to apply when listing time series data.
 * @param interval The time interval for which to retrieve data.
 * @param aggregation The aggregation to apply to the time series data.
 * @param view Specifies which information is returned about the time series.
 * @param pageSize The maximum number of results to return.
 * @param pageToken If present, then retrieve the next batch of results.
 * @returns A promise that resolves with a string containing the time series
 *     data in JSON format, or an error message.
 */
export async function listTimeSeries(
  name: string,
  filter: string,
  interval: {
    startTime?: string;
    endTime: string;
  },
  aggregation?: Aggregation,
  pageSize?: number,
  pageToken?: string,
): Promise<string> {
  const request = {
    name,
    filter,
    'interval.startTime': interval.startTime,
    'interval.endTime': interval.endTime,
    ...(aggregation && {
      'aggregation.alignmentPeriod': aggregation.alignmentPeriod,
      'aggregation.perSeriesAligner': aggregation.perSeriesAligner,
    }),
    pageSize,
    pageToken,
  };

  try {
    const response = await monitoring.projects.timeSeries.list(request);
    return JSON.stringify(response.data.timeSeries || [], null, 2);
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Failed to list time series: ${error.message}`);
    }
    throw new Error('An unknown error occurred while listing time series.');
  }
}

/**
 * Lists alert policies from the Google Cloud Monitoring API.
 * @param name The project whose alert policies are to be listed.
 * @param filter The filter to apply when listing alert policies.
 * @param orderBy The sorting order for the results.
 * @param pageSize The maximum number of results to return.
 * @param pageToken If present, then retrieve the next batch of results.
 * @returns A promise that resolves with a string containing the alert policies
 *     in JSON format, or an error message.
 */
export async function listAlertPolicies(
  name: string,
  filter?: string,
  orderBy?: string,
  pageSize?: number,
  pageToken?: string,
): Promise<string> {
  const request = {
    name,
    filter,
    orderBy,
    pageSize,
    pageToken,
  };

  try {
    const response = await monitoring.projects.alertPolicies.list(request);
    return JSON.stringify(response.data.alertPolicies || [], null, 2);
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Failed to list alert policies: ${error.message}`);
    }
    throw new Error('An unknown error occurred while listing alert policies.');
  }
}

/**
 * Lists alerts from the Google Cloud Monitoring API.
 * @param parent Required. The name of the project to list alerts for.
 * @param filter Optional. An alert is returned if there is a match on any fields belonging to the alert or its subfields.
 * @param orderBy Optional. A comma-separated list of fields in Alert to use for sorting. The default sort direction is ascending. To specify descending order for a field, add a desc modifier. The following fields are supported: open_time close_timeFor example, close_time desc, open_time will return the alerts closed most recently, with ties broken in the order of older alerts listed first.If the field is not set, the results are sorted by open_time desc.
 * @param pageSize Optional. The maximum number of results to return in a single response. If not set to a positive number, at most 50 alerts will be returned. The maximum value is 1000; values above 1000 will be coerced to 1000.
 * @param pageToken Optional. If non-empty, page_token must contain a value returned as the next_page_token in a previous response to request the next set of results.
 * @returns A promise that resolves with a string containing the alerts
 *     in JSON format, or an error message.
 */
export async function listAlerts(
  parent: string,
  filter?: string,
  orderBy?: string,
  pageSize?: number,
  pageToken?: string,
): Promise<string> {
  const request = {
    parent,
    filter,
    orderBy,
    pageSize,
    pageToken,
  };

  try {
    const response = await monitoring.projects.alerts.list(request);
    return JSON.stringify(response.data.alerts || [], null, 2);
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Failed to list alerts: ${error.message}`);
    }
    throw new Error('An unknown error occurred while listing alerts.');
  }
}
