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

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { apiClientFactory } from '../../utility/index.js';
import { logger } from '../../utility/logger.js';
import { TableField } from '@google-cloud/bigquery';

const serviceName = 'storageinsights.googleapis.com';

const inputSchema = {
  datasetConfigName: z
    .string()
    .describe(
      'The name of the dataset configuration.',
    ),
  datasetConfigLocation: z
    .string()
    .describe(
      'The location of the dataset configuration.',
    ),
  projectId: z
    .string()
    .optional()
    .describe(
      'The project ID to check Storage Insights availability for.',
    ),
};

type GetMetadataTableSchemaParams = z.infer<z.ZodObject<typeof inputSchema>>;

interface TableFieldWithHint extends TableField {
  hint?: string | undefined;
}

export async function getMetadataTableSchema(
  params: GetMetadataTableSchemaParams,
): Promise<CallToolResult> {
  const bigqueryClient = apiClientFactory.getBigQueryClient();
  const storageInsightsClient = apiClientFactory.getStorageInsightsClient();
  const serviceUsageClient = apiClientFactory.getServiceUsageClient();
  const projectId = params.projectId || process.env['GOOGLE_CLOUD_PROJECT'] || process.env['GCP_PROJECT_ID'];

  if (!projectId) {
    throw new Error(
      'Project ID not specified. Please specify via the projectId parameter or GOOGLE_CLOUD_PROJECT or GCP_PROJECT_ID environment variable.',
    );
  }

  const [services] = await serviceUsageClient.listServices({
    parent: `projects/${projectId}`,
    filter: 'state:ENABLED',
  });

  const isEnabled = services.some((service: any) => service.config?.name === serviceName);

  if (!isEnabled) {
    throw new Error(
      `Storage Insights API is not enabled for project ${projectId}. Please enable it to proceed.`,
    );
  }

  let config;
  try {
    [config] = await storageInsightsClient.getDatasetConfig({
      name: `projects/${projectId}/locations/${params.datasetConfigLocation}/datasetConfigs/${params.datasetConfigName}`,
    });
  } catch (error) {
    const err = error instanceof Error ? error : undefined;
    logger.error('Error getting dataset config:', err);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: 'Failed to retrieve dataset configuration',
            details: err?.message,
          }),
        },
      ],
    };
  }

  const objectHints = new Map<string, string>([
    ['snapshotTime', 'The snapshot time of the object metadata in RFC 3339 format.'],
    ['bucket', 'The name of the bucket containing this object.'],
    ['location', 'The location of the source bucket.'],
    [
      'componentCount',
      'Returned for composite objects only. Number of non-composite objects in the composite object.',
    ],
    ['contentDisposition', 'Content-Disposition of the object data.'],
    ['contentEncoding', 'Content-Encoding of the object data.'],
    ['contentLanguage', 'Content-Language of the object data.'],
    [
      'contentType',
      'Content-Type of the object data. If an object is stored without a Content-Type, it is served as application/octet-stream.',
    ],
    [
      'crc32c',
      'CRC32c checksum, as described in RFC 4960, Appendix B; encoded using base64 in big-endian byte order.',
    ],
    ['customTime', 'A user-specified timestamp for the object in RFC 3339 format.'],
    ['etag', 'HTTP 1.1 Entity tag for the object.'],
    ['eventBasedHold', 'Whether or not the object is subject to an event-based hold.'],
    ['generation', 'The content generation of this object. Used for object versioning.'],
    [
      'md5Hash',
      'MD5 hash of the data, encoded using base64. This field is not present for composite objects.',
    ],
    ['mediaLink', "A URL for downloading the object's data."],
    ['metadata', 'User-provided metadata, in key/value pairs.'],
    ['metadata.key', 'An individual metadata entry key.'],
    ['metadata.value', 'An individual metadata entry value.'],
    ['metageneration', 'The version of the metadata for this object at this generation.'],
    ['name', 'The name of the object.'],
    ['selfLink', 'A URL for this object.'],
    ['size', 'Content-Length of the data in bytes.'],
    ['storageClass', 'Storage class of the object.'],
    ['temporaryHold', 'Whether or not the object is subject to a temporary hold.'],
    ['timeCreated', 'The creation time of the object in RFC 3339 format.'],
    [
      'timeDeleted',
      'The deletion time of the object in RFC 3339 format. Returned if and only if this version of the object is no longer a live version, but remains in the bucket as a noncurrent version.',
    ],
    ['updated', 'The modification time of the object metadata in RFC 3339 format.'],
    ['timeStorageClassUpdated', "The time at which the object's storage class was last changed."],
    [
      'retentionExpirationTime',
      'The earliest time that the object can be deleted, in RFC 3339 format.',
    ],
    [
      'softDeleteTime',
      'If this object has been soft-deleted, this is the time at which it became soft-deleted.',
    ],
    [
      'hardDeleteTime',
      'This is the time (in the future) when the object will no longer be restorable.',
    ],
    ['project', 'The project number of the project the bucket belongs to.'],
  ]);

  const bucketHints = new Map<string, string>([
    ['snapshotTime', 'The snapshot time of the metadata in RFC 3339 format.'],
    ['name', 'The name of the source bucket.'],
    ['location', 'The location of the source bucket (e.g., "US", "EU", "ASIA-EAST1").'],
    ['project', 'The project number of the project the bucket belongs to.'],
    [
      'storageClass',
      'The bucket\'s default storage class (e.g., "STANDARD", "NEARLINE", "COLDLINE").',
    ],
    [
      'public.bucketPolicyOnly',
      'Deprecated field. Whether to enforcement uniform bucket-level access. This concept is now represented by iamConfiguration.uniformBucketLevelAccess.enabled.',
    ],
    [
      'public.publicAccessPrevention',
      'The bucket\'s public access prevention status ("inherited" or "enforced"). This is the same setting as iamConfiguration.publicAccessPrevention.',
    ],
    ['autoclass.enabled', 'Whether Autoclass is enabled for the bucket.'],
    ['autoclass.toggleTime', 'The time Autoclass was last enabled or disabled.'],
    ['versioning', 'Boolean indicating if Object Versioning is enabled for the bucket.'],
    [
      'lifecycle',
      'Boolean indicating if the bucket has an Object Lifecycle Management configuration.',
    ],
    ['metageneration', 'The metadata generation of this bucket.'],
    [
      'timeCreated',
      'The creation time of the bucket in RFC 3339 format. To perform date calculations, use DATE_SUB or DATE_ADD with CURRENT_DATE()',
    ],
    ['tags.tagMap.key', 'The key of a tag.'],
    ['tags.tagMap.value', 'The value of a tag.'],
    ['tags.lastUpdatedTime', 'The last updated time for the tags.'],
    ['labels.key', 'An individual label entry key.'],
    ['labels.value', 'An individual label entry value.'],
    [
      'softDeletePolicy.retentionDurationSeconds',
      'The duration in seconds that soft-deleted objects will be retained.',
    ],
    [
      'softDeletePolicy.effectiveTime',
      'The time from which the soft delete policy became effective.',
    ],
    [
      'iamConfiguration.uniformBucketLevelAccess.enabled',
      'If True, Uniform bucket-level access is enabled, disabling object-level ACLs. This replaces the legacy public.bucketPolicyOnly field.',
    ],
    [
      'iamConfiguration.publicAccessPrevention',
      'The bucket\'s public access prevention status ("inherited" or "enforced"). This is the same setting as public.publicAccessPrevention.',
    ],
    [
      'resourceTags',
      'This field appears to be redundant. Bucket resource tags are properly represented under the tags field.',
    ],
    [
      'objectCount',
      'Total number of objects in the bucket. This is a recent addition for aggregated bucket metrics.',
    ],
    [
      'totalSize',
      'Total size of the bucket in bytes. This is a recent addition for aggregated bucket metrics.',
    ],
  ]);

  try {
    const linkedDataset = config.link?.dataset;
    if (linkedDataset) {
      const parts = linkedDataset.split('/');
      const datasetId = parts[parts.length - 1];
      if (!datasetId) {
        throw new Error('Could not extract dataset ID from linked dataset.');
      }
      const bucketViewId = 'bucket_attributes_latest_snapshot_view';
      const objectViewId = 'object_attributes_latest_snapshot_view';

      const [bucketViewMetadata] = await bigqueryClient
        .dataset(datasetId)
        .table(bucketViewId)
        .getMetadata();

      const [objectViewMetadata] = await bigqueryClient
        .dataset(datasetId)
        .table(objectViewId)
        .getMetadata();

      const bucketViewFields: TableFieldWithHint[] = bucketViewMetadata.schema.fields.map(
        (field: TableField) => {
          const fieldWithHint: TableFieldWithHint = { ...field };
          if (field.name && bucketHints.has(field.name)) {
            fieldWithHint.hint = bucketHints.get(field.name);
          }
          return fieldWithHint;
        },
      );

      const objectViewFields: TableFieldWithHint[] = objectViewMetadata.schema.fields.map(
        (field: TableField) => {
          const fieldWithHint: TableFieldWithHint = { ...field };
          if (field.name && objectHints.has(field.name)) {
            fieldWithHint.hint = objectHints.get(field.name);
          }
          return fieldWithHint;
        },
      );

      const result = {
        [`${datasetId}.${bucketViewId}`]: bucketViewFields,
        [`${datasetId}.${objectViewId}`]: objectViewFields,
        ...config,
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result),
          },
        ],
      };
    }
    throw new Error('Configuration does not have a linked dataset.');
  } catch (error) {
    const err = error instanceof Error ? error : undefined;
    logger.error('Error getting metadata table schema:', err);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: 'Failed to get metadata table schema',
            details: err?.message,
          }),
        },
      ],
    };
  }
}

export const registerGetMetadataTableSchemaTool = (server: McpServer) => {
  server.registerTool(
    'get_metadata_table_schema',
    {
      description:
        'Checks if GCS insights service is enabled and returns the BigQuery table schema for a given insights dataset configuration in JSON format. Also returns hints for each column in the table',
      inputSchema,
      annotations: {
        displayOutput: false,
      },
    },
    getMetadataTableSchema,
  );
};
