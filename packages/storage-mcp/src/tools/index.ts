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
  registerCheckIamPermissionsTool,
  registerCreateBucketTool,
  registerDeleteBucketTool,
  registerGetBucketLocationTool,
  registerGetBucketMetadataTool,
  registerListBucketsTool,
  registerUpdateBucketLabelsTool,
  registerViewIamPolicyTool,
} from './buckets/index.js';
import {
  registerCopyObjectTool,
  registerCopyObjectSafeTool,
  registerDeleteObjectTool,
  registerDownloadObjectTool,
  registerListObjectsTool,
  registerMoveObjectTool,
  registerReadObjectContentTool,
  registerReadObjectMetadataTool,
  registerUpdateObjectMetadataTool,
  registerUploadObjectTool,
  registerUploadObjectSafeTool,
  registerWriteObjectTool,
  registerWriteObjectSafeTool,
} from './objects/index.js';
import {
  registerCheckInsightsAvailabilityTool,
  registerExecuteInsightsQueryTool,
  registerGetMetadataTableSchemaTool,
} from './insights/index.js';

export const commonSafeTools = [
  registerListBucketsTool,
  registerGetBucketLocationTool,
  registerGetBucketMetadataTool,
  registerViewIamPolicyTool,
  registerCheckIamPermissionsTool,
  registerCreateBucketTool,
  registerListObjectsTool,
  registerReadObjectContentTool,
  registerReadObjectMetadataTool,
  registerDownloadObjectTool,
  registerDeleteObjectTool,
  registerCheckInsightsAvailabilityTool,
  registerGetMetadataTableSchemaTool,
  registerExecuteInsightsQueryTool,
];

export const safeWriteTools = [
  registerWriteObjectSafeTool,
  registerUploadObjectSafeTool,
  registerCopyObjectSafeTool,
];

export const destructiveWriteTools = [
  registerWriteObjectTool,
  registerUploadObjectTool,
  registerCopyObjectTool,
];

export const otherDestructiveTools = [
  registerDeleteBucketTool,
  registerUpdateBucketLabelsTool,
  registerMoveObjectTool,
  registerUpdateObjectMetadataTool,
];
