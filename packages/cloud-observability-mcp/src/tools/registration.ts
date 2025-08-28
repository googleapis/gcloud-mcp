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

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { toolWrapper } from '../utils/index.js';
import {
  listGroupStats,
  listLogEntries,
  listLogNames,
  listBuckets,
  listViews,
  listSinks,
  listLogScopes,
  listMetricDescriptors,
  listTimeSeries,
  listAlertPolicies,
  listTraces,
  getTrace,
} from './index.js';

export const registerTools = (server: McpServer): void => {
  server.tool(
    'list_log_entries',
    `Use this as the primary tool to search and retrieve log entries from Google Cloud Logging.
    It's essential for debugging application behavior, finding specific error messages, or auditing events.
    The 'filter' is powerful and can be used to select logs by severity, resource type, text content, and more.
    `,
    {
      resourceNames: z.array(z.string()).describe(
        `Required. Names of one or more parent resources from which to retrieve log entries.
          Resources may either be resource containers (e.g. 'projects/[PROJECT_ID]') or specific LogViews (e.g. 'projects/[PROJECT_ID]/locations/[LOCATION_ID]/buckets/[BUCKET_ID]/views/[VIEW_ID]').
          For the case of resource containers, all logs ingested into that container will be returned regardless of which LogBuckets they are actually stored in - i.e. these queries may fan out to multiple regions.
          Projects listed in the project_ids field are added to this list.
          A maximum of 100 resources may be specified in a single request.`,
      ),
      filter: z
        .string()
        .optional()
        .describe(
          `Optional. A filter that chooses which log entries to return.
          For more information, see Logging query language (https://cloud.google.com/logging/docs/view/logging-query-language).
          Only log entries that match the filter are returned.
          An empty filter matches all log entries in the resources listed in resource_names.
          Referencing a parent resource that is not listed in resource_names will cause the filter to return no results.
          To make queries faster, you can make the filter more selective by using restrictions on indexed fields (https://cloud.google.com/logging/docs/view/logging-query-language#indexed-fields) as well as limit the time range of the query by adding range restrictions on the timestamp field.
          Examples:
          - To find all error-level logs: 'severity="ERROR"'
          - To find logs from a specific GCE instance: 'resource.type="gce_instance" AND resource.labels.instance_id="1234567890123456789"'
          - To find logs containing a specific text message: 'textPayload:"database connection failed"'
          - To find logs within a specific time range: 'timestamp >= "2025-01-01T00:00:00Z" AND timestamp < "2025-01-01T01:00:00Z"'`,
        ),
      orderBy: z
        .enum(['timestamp asc', 'timestamp desc'])
        .optional()
        .default('timestamp asc')
        .describe(
          `Optional. How the results should be sorted.
          The timestamp asc option returns entries in order of increasing values of LogEntry.timestamp (oldest first), and the second option returns entries in order of decreasing timestamps (newest first).
          Entries with equal timestamps are returned in order of their insert_id values.
          We recommend setting the order_by field to "timestamp desc" when listing recently ingested log entries.
          If not set, the default value of "timestamp asc" may take a long time to fetch matching logs that are only recently ingested.`,
        ),
      pageSize: z
        .number()
        .optional()
        .default(50)
        .describe(
          `Optional. The maximum number of results to return from this request.
          Default is 50. If the value is negative, the request is rejected.
          The presence of next_page_token in the response indicates that more results might be available.`,
        ),
      pageToken: z
        .string()
        .optional()
        .describe(
          `Optional. If present, then retrieve the next batch of results from the preceding call to this method.
          page_token must be the value of next_page_token from the previous response.
          The values of other method parameters should be identical to those in the previous call.`,
        ),
    },
    (params: {
      resourceNames: string[];
      filter?: string;
      orderBy?: 'timestamp asc' | 'timestamp desc';
      pageSize?: number;
      pageToken?: string;
    }) =>
      toolWrapper(async () =>
        listLogEntries(
          params.resourceNames,
          params.filter,
          params.orderBy,
          params.pageSize,
          params.pageToken,
        ),
      ),
  );

  server.tool(
    'list_log_names',
    `Use this as the primary tool to list the log names in a Google Cloud project.
    This is useful for discovering what logs are available for a project.
    Only logs which have log entries will be listed.`,
    {
      parent: z.string().describe(
        `Required. The parent resource whose logs are to be listed:
        e.g. "projects/[PROJECT_ID]""`,
      ),
      pageSize: z
        .number()
        .optional()
        .default(50)
        .describe(
          `Optional. The maximum number of results to return from this request.
          Non-positive values are ignored.
          The presence of nextPageToken in the response indicates that more results might be available.`,
        ),
      pageToken: z
        .string()
        .optional()
        .describe(
          `Optional. If present, then retrieve the next batch of results from the preceding call to this method.
          pageToken must be the value of nextPageToken from the previous response.
          The values of other method parameters should be identical to those in the previous call.`,
        ),
    },
    (params: { parent: string; pageSize?: number; pageToken?: string }) =>
      toolWrapper(async () => listLogNames(params.parent, params.pageSize, params.pageToken)),
  );

  server.tool(
    'list_buckets',
    `Use this as the primary tool to list the log buckets in a Google Cloud project.
    Log buckets are containers that store and organize your log data.
    This tool is useful for understanding how your logs are stored and for managing your logging configurations.`,
    {
      parent: z.string().describe(
        `Required. The parent resource whose buckets are to be listed:
        "projects/[PROJECT_ID]/locations/[LOCATION_ID]"
        "organizations/[ORGANIZATION_ID]/locations/[LOCATION_ID]"
        "billingAccounts/[BILLING_ACCOUNT_ID]/locations/[LOCATION_ID]"
        "folders/[FOLDER_ID]/locations/[LOCATION_ID]"
        Note: The locations portion of the resource must be specified, but supplying the character - in place of LOCATION_ID will return all buckets.`,
      ),
      pageSize: z
        .number()
        .optional()
        .default(50)
        .describe(
          `Optional. The maximum number of results to return from this request.
          Non-positive values are ignored.
          The presence of nextPageToken in the response indicates that more results might be available.`,
        ),
      pageToken: z
        .string()
        .optional()
        .describe(
          `Optional. If present, then retrieve the next batch of results from the preceding call to this method.
          pageToken must be the value of nextPageToken from the previous response.
          The values of other method parameters should be identical to those in the previous call.`,
        ),
    },
    (params: { parent: string; pageSize?: number; pageToken?: string }) =>
      toolWrapper(async () => listBuckets(params.parent, params.pageSize, params.pageToken)),
  );

  server.tool(
    'list_views',
    `Use this as the primary tool to list the log views in a given log bucket.
    Log views provide fine-grained access control to the logs in your buckets.
    This is useful for managing who has access to which logs.`,
    {
      parent: z
        .string()
        .describe(
          'Required. The bucket whose views are to be listed: "projects/[PROJECT_ID]/locations/[LOCATION_ID]/buckets/[BUCKET_ID]"',
        ),
      pageSize: z
        .number()
        .optional()
        .default(50)
        .describe(
          `Optional. The maximum number of results to return from this request.
          Non-positive values are ignored.
          The presence of nextPageToken in the response indicates that more results might be available.`,
        ),
      pageToken: z
        .string()
        .optional()
        .describe(
          `Optional. If present, then retrieve the next batch of results from the preceding call to this method.
          pageToken must be the value of nextPageToken from the previous response.
          The values of other method parameters should be identical to those in the previous call.`,
        ),
    },
    (params: { parent: string; pageSize?: number; pageToken?: string }) =>
      toolWrapper(async () => listViews(params.parent, params.pageSize, params.pageToken)),
  );

  server.tool(
    'list_sinks',
    `Use this as the primary tool to list the log sinks in a Google Cloud project.
    Log sinks control how Cloud Logging routes your logs to supported destinations, such as Cloud Storage buckets, BigQuery datasets, or Pub/Sub topics.
    This is useful for understanding your logging export configurations.`,
    {
      parent: z.string().describe(
        `Required. The parent resource whose sinks are to be listed:
        "projects/[PROJECT_ID]"
        "organizations/[ORGANIZATION_ID]"
        "billingAccounts/[BILLING_ACCOUNT_ID]"
        "folders/[FOLDER_ID]"`,
      ),
      pageSize: z
        .number()
        .optional()
        .default(50)
        .describe(
          `Optional. The maximum number of results to return from this request.
          Non-positive values are ignored.
          The presence of nextPageToken in the response indicates that more results might be available.`,
        ),
      pageToken: z
        .string()
        .optional()
        .describe(
          `Optional. If present, then retrieve the next batch of results from the preceding call to this method.
          pageToken must be the value of nextPageToken from the previous response.
          The values of other method parameters should be identical to those in the previous call.`,
        ),
    },
    (params: { parent: string; pageSize?: number; pageToken?: string }) =>
      toolWrapper(async () => listSinks(params.parent, params.pageSize, params.pageToken)),
  );

  server.tool(
    'list_log_scopes',
    `Use this as the primary tool to list the log scopes in a Google Cloud project.
    Log scopes allow you to query logs from multiple projects in a single view.
    This is useful for centralized logging across a large organization.`,
    {
      parent: z.string().describe(
        `Required. The parent resource whose log scopes are to be listed: "projects/[PROJECT_ID]/locations/[LOCATION_ID]".
        The default location is "global".`,
      ),
      pageSize: z
        .number()
        .optional()
        .default(50)
        .describe(
          `Optional. The maximum number of results to return from this request.
          Non-positive values are ignored.
          The presence of nextPageToken in the response indicates that more results might be available.`,
        ),
      pageToken: z
        .string()
        .optional()
        .describe(
          `Optional. If present, then retrieve the next batch of results from the preceding call to this method.
          pageToken must be the value of nextPageToken from the previous response.
          The values of other method parameters should be identical to those in the previous call.`,
        ),
    },
    (params: { parent: string; pageSize?: number; pageToken?: string }) =>
      toolWrapper(async () => listLogScopes(params.parent, params.pageSize, params.pageToken)),
  );

  server.tool(
    'list_metric_descriptors',
    `Use this as the primary tool to discover the types of metrics available in a Google Cloud project.
    This is a good first step to understanding what data is available for monitoring and building dashboards or alerts.`,
    {
      name: z.string().describe(
        `Required. The project on which to execute the request.
        The format is: projects/[PROJECT_ID_OR_NUMBER]`,
      ),
      filter: z
        .string()
        .optional()
        .describe(
          `Optional. If this field is empty, all custom and system-defined metric descriptors are returned.
          Otherwise, the filter specifies which metric descriptors are to be returned. See Monitoring Query Language (https://cloud.google.com/monitoring/api/v3/filters) for more details.
          Examples:
          - To find metrics related to GCE instances: 'resource.type = "gce_instance"'
          - To find a specific metric type: 'metric.type = "compute.googleapis.com/instance/cpu/usage_time"'
          - To find all metrics with "cpu" in their type: 'metric.type : "cpu"'`,
        ),
      pageSize: z
        .number()
        .optional()
        .default(50)
        .describe('Optional. A positive number that is the maximum number of results to return.'),
      pageToken: z
        .string()
        .optional()
        .describe(
          `Optional. If this field is not empty then it must contain the nextPageToken value returned by a previous call to this method.`,
        ),
    },
    (params: { name: string; filter?: string; pageSize?: number; pageToken?: string }) =>
      toolWrapper(async () =>
        listMetricDescriptors(params.name, params.filter, params.pageSize, params.pageToken),
      ),
  );

  server.tool(
    'list_time_series',
    `Use this as the primary tool to retrieve metric data over a specific time period.
    This is the core tool for monitoring and observability, allowing you to get the actual data points for a given metric.`,
    {
      name: z.string().describe(
        `Required. The project, organization or folder on which to execute the request. The format is:
        projects/[PROJECT_ID_OR_NUMBER]
        organizations/[ORGANIZATION_ID]
        folders/[FOLDER_ID]`,
      ),
      filter: z.string().describe(
        `Required. A monitoring filter that specifies which time series should be returned.
        (https://cloud.google.com/monitoring/api/v3/filters#time-series-filter).
        Examples:
        - To get CPU usage:
            'metric.type = "compute.googleapis.com/instance/cpu/usage_time"'
        - To return all time series from a specific Compute Engine instance, use the following filter:
            'metric.type = "compute.googleapis.com/instance/cpu/usage_time" AND metric.labels.instance_name = "my-instance-name"'
        - To return all time series from Compute Engine instances whose names start with frontend-, use the following filter:
            'metric.type = "compute.googleapis.com/instance/cpu/usage_time" AND metric.labels.instance_name = starts_with("frontend-")'`,
      ),
      interval: z
        .object({
          startTime: z
            .string()
            .optional()
            .describe(
              `Optional. Start of the time interval (inclusive) during which the time series data was collected.
              Must be in RFC 3339 format.`,
            ),
          endTime: z.string().describe(
            `Required. End of the time interval (inclusive) during which the time series data was collected.
            Must be in RFC 3339 format.`,
          ),
        })
        .describe(
          `Required. The time interval for which results should be returned.
        Only time series that contain data points in the specified interval are included in the response.`,
        ),
      aggregation: z
        .object({
          alignmentPeriod: z
            .string()
            .optional()
            .default('60')
            .describe(
              `The alignmentPeriod specifies a time interval, in seconds, that is used to divide the data in all the time series into consistent blocks of time.
              The value must be at least 60 seconds.`,
            ),
          perSeriesAligner: z
            .enum([
              'ALIGN_NONE',
              'ALIGN_DELTA',
              'ALIGN_RATE',
              'ALIGN_INTERPOLATE',
              'ALIGN_NEXT_OLDER',
              'ALIGN_MIN',
              'ALIGN_MAX',
              'ALIGN_MEAN',
              'ALIGN_COUNT',
              'ALIGN_SUM',
              'ALIGN_STDDEV',
              'ALIGN_PERCENTILE_99',
              'ALIGN_PERCENTILE_95',
              'ALIGN_PERCENTILE_50',
              'ALIGN_PERCENT_CHANGE',
            ])
            .optional()
            .describe(
              `An Aligner describes how to bring the data points in a single time series into temporal alignment.
              Except for ALIGN_NONE, all alignments cause all the data points in an alignmentPeriod to be mathematically grouped together, resulting in a single data point for each alignmentPeriod with end timestamp at the end of the period.`,
            ),
        })
        .optional()
        .describe(
          'Optional. Specifies the alignment of data points in individual time series. By default (if no aggregation is explicitly specified), the raw time series data is returned.',
        ),
      pageSize: z
        .number()
        .optional()
        .default(50)
        .describe('Optional. A positive number that is the maximum number of results to return.'),
      pageToken: z
        .string()
        .optional()
        .describe(
          `Optional. If this field is not empty then it must contain the nextPageToken value returned by a previous call to this method.`,
        ),
    },
    (params: {
      name: string;
      filter: string;
      interval: {
        startTime?: string;
        endTime: string;
      };
      aggregation?: {
        alignmentPeriod?: string;
        perSeriesAligner?: string;
      };
      pageSize?: number;
      pageToken?: string;
    }) =>
      toolWrapper(async () =>
        listTimeSeries(
          params.name,
          params.filter,
          params.interval,
          params.aggregation,
          params.pageSize,
          params.pageToken,
        ),
      ),
  );

  server.tool(
    'list_alert_policies',
    `Use this as the primary tool to list the alerting policies in a Google Cloud project.
    Alerting policies define the conditions under which you want to be notified about issues with your services.
    This is useful for understanding what alerts are currently configured.`,
    {
      name: z.string().describe(
        `Required. The project whose alert policies are to be listed.
        The format is: projects/[PROJECT_ID_OR_NUMBER]`,
      ),
      filter: z
        .string()
        .optional()
        .describe(
          `Optional. If provided, this field specifies the criteria that must be met by alert policies to be included in the response.
          For more information on filtering alert policies see Cloud Monitoring Filter Syntax (https://cloud.google.com/monitoring/api/v3/sorting-and-filtering#filter_syntax)
          Examples:
          - To return all entries with a non-empty display name or description where the user_labels field has the active key set (with any value):
              (NOT display_name.empty OR NOT description.empty) AND user_labels='active'
          - To return all entries whose description contains 'cloud':
              description:'cloud'
          - To return all entries whose title matches "Temp XYZ":
              display_name=monitoring.regex.full_match('Temp \\d{3}')`,
        ),
      orderBy: z
        .string()
        .optional()
        .describe(
          `Optional. A comma-separated list of fields by which to sort the result.
          The result will be sorted by aescending order.
          If a field is prefixed with a -, it is sorted in descending order.
          Sortable fields are: name, display_name, documentation.content, documentation.mime_type, user_labels, conditions.size, combiner, enabled, notification_channels.`,
        ),
      pageSize: z
        .number()
        .optional()
        .default(50)
        .describe('Optional. The maximum number of results to return in a single response.'),
      pageToken: z
        .string()
        .optional()
        .describe(
          `Optional. If this field is not empty then it must contain the nextPageToken value returned by a previous call to this method.`,
        ),
    },
    (params: {
      name: string;
      filter?: string;
      orderBy?: string;
      pageSize?: number;
      pageToken?: string;
    }) =>
      toolWrapper(async () =>
        listAlertPolicies(
          params.name,
          params.filter,
          params.orderBy,
          params.pageSize,
          params.pageToken,
        ),
      ),
  );

  server.tool(
    'list_traces',
    `Use this as the primary tool to retrieve and examine distributed traces from Google Cloud Trace.
    Traces provide a detailed view of the path of a request as it travels through your application's services.
    This is essential for understanding latency issues and debugging complex, multi-service workflows.
    This will only return the root trace span, to gather full information call get_trace with that id.`,
    {
      projectId: z.string().describe('Required. The Google Cloud project ID.'),
      filter: z
        .string()
        .optional()
        .describe(
          `Optional.
          The filter to apply when listing traces.
          For more information on building trace filters see Cloud Trace Filters (https://cloud.google.com/trace/docs/trace-filters).
          Some examples:
            To filter for latency greater than or equal to a value, do latency:[DURATION] (e.g. 'latency:1s', 'latency:500ms')
            For a prefix string match on the root span name, do root:[NAME_PREFIX] (e.g. 'root:main.api.HTTP')
            For an exact string match on the root span name, do +root:[NAME] (e.g. '+root:main.api.HTTP Get')
            To filter by HTTP status code: 'http.status_code:[CODE]' (e.g. 'http.status_code:500')
            To filter by method: 'method:[METHOD_NAME]' (e.g. 'method:Get')`,
        ),
      orderBy: z
        .string()
        .optional()
        .describe(
          `Optional. Field used to sort the returned traces.
          Can be one of the following: 'trace_id', 'name', 'duration', 'start'.
          Descending order can be specified by appending 'desc' to the sort field.`,
        ),
      pageSize: z
        .number()
        .optional()
        .default(50)
        .describe('Optional. The maximum number of traces to return.'),
      pageToken: z
        .string()
        .optional()
        .describe('Optional. Token identifying the page of results to return.'),
      startTime: z
        .string()
        .optional()
        .describe(
          `Optional. Start of the time interval (inclusive) during which the trace data was collected from the application.
          Must be in RFC 3339 format.`,
        ),
      endTime: z
        .string()
        .optional()
        .describe(
          `Optional. End of the time interval (inclusive) during which the trace data was collected from the application.
          Must be in RFC 3339 format.`,
        ),
    },
    (params: {
      projectId: string;
      filter?: string;
      orderBy?: string;
      pageSize?: number;
      pageToken?: string;
      startTime?: string;
      endTime?: string;
    }) =>
      toolWrapper(async () =>
        listTraces(
          params.projectId,
          params.filter,
          params.orderBy,
          params.pageSize,
          params.pageToken,
          params.startTime,
          params.endTime,
        ),
      ),
  );

  server.tool(
    'get_trace',
    `Use this as the primary tool to retrieve a single distributed trace from Google Cloud Trace.
    Traces provide a detailed view of the path of a request as it travels through your application's services.
    This is essential for understanding latency issues and debugging complex, multi-service workflows.
    This is often used as a follow on to list_traces to get full details on a specific trace.`,
    {
      projectId: z.string().describe('Required. The Google Cloud project ID.'),
      traceId: z.string().describe('Required. The ID of the trace to retrieve.'),
    },
    (params: { projectId: string; traceId: string }) =>
      toolWrapper(async () => getTrace(params.projectId, params.traceId)),
  );

  server.tool(
    'list_group_stats',
    `Use this tool ONLY to find and analyze recurring stack traces in your application. 
    It aggregates similar stack traces, providing statistics like the number of occurrences and the number of affected users.

    DO NOT use this tool for general error searches or to view individual error logs. For queries asking to "find errors", or "show me errors", you MUST use list_log_entries tool.

    CRITICAL: Default to other tooling for generic questions about errors.`,
    {
      projectName: z.string().describe(
        `Required. The resource name of the Google Cloud Platform project.
          Written as 'projects/{projectID}' or 'projects/{projectNumber}'.`,
      ),
      timeRangePeriod: z
        .enum([
          'PERIOD_1_HOUR',
          'PERIOD_6_HOURS',
          'PERIOD_1_DAY',
          'PERIOD_1_WEEK',
          'PERIOD_30_DAYS',
        ])
        .optional()
        .default('PERIOD_6_HOURS')
        .describe('Optional. The time range to query.'),
      order: z
        .enum(['COUNT_DESC', 'LAST_SEEN_DESC', 'CREATED_DESC', 'AFFECTED_USERS_DESC'])
        .optional()
        .default('COUNT_DESC')
        .describe('Optional. The sort order in which the results are returned.'),
      pageSize: z
        .number()
        .optional()
        .default(20)
        .describe('Optional. The maximum number of results to return per response.'),
      pageToken: z
        .string()
        .optional()
        .describe('Optional. A next_page_token provided by a previous response.'),
    },
    (params: {
      projectName: string;
      timeRangePeriod?: string;
      order?: string;
      pageSize?: number;
      pageToken?: string;
    }) =>
      toolWrapper(async () =>
        listGroupStats(
          params.projectName,
          params.timeRangePeriod,
          params.order,
          params.pageSize,
          params.pageToken,
        ),
      ),
  );
};
