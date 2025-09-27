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

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { expectSuccess } from './helpers.js';
import { createBucket } from '../../src/tools/buckets/create_bucket.js';
import { deleteBucket } from '../../src/tools/buckets/delete_bucket.js';
import { getBucketMetadata } from '../../src/tools/buckets/get_bucket_metadata.js';
import { updateBucketLabels } from '../../src/tools/buckets/update_bucket_labels.js';
import { viewIamPolicy } from '../../src/tools/buckets/view_iam_policy.js';
import { checkIamPermissions } from '../../src/tools/buckets/check_iam_permissions.js';
import { writeObject } from '../../src/tools/objects/write_object.js';
import { readObjectContent } from '../../src/tools/objects/read_object_content.js';
import { deleteObject } from '../../src/tools/objects/delete_object.js';
import { readObjectMetadata } from '../../src/tools/objects/read_object_metadata.js';
import { uploadObject } from '../../src/tools/objects/upload_object.js';
import { listObjects } from '../../src/tools/objects/list_objects.js';
import { moveObject } from '../../src/tools/objects/move_object.js';
import { getBucketLocation } from '../../src/tools/buckets/get_bucket_location.js';
import { copyObject } from '../../src/tools/objects/copy_object.js';
import { updateObjectMetadata } from '../../src/tools/objects/update_object_metadata.js';
import { downloadObject } from '../../src/tools/objects/download_object.js';
import { listBuckets } from '../../src/tools/buckets/list_buckets.js';
import * as fs from 'fs';
import * as path from 'path';

// This is an integration test that requires a running GCS instance
// and application default credentials to be set up.
// The test will create a bucket, perform some operations, and then delete the bucket.

const projectId = process.env['GOOGLE_CLOUD_PROJECT'] || process.env['GCP_PROJECT_ID'];
if (!projectId) {
  throw new Error('GOOGLE_CLOUD_PROJECT or GCP_PROJECT_ID environment variable not set');
}

const bucketName = `gcs-mcp-integration-test-${Date.now()}`;
const testLabel = { 'gcs-mcp-test': 'true' };
const testObjectContent = 'This is a test object.';
const testObjectName = 'test-object.txt';
const testUploadFileName = 'test-upload.txt';
const movedObjectName = 'moved-object.txt';

describe('GCS Integration Tests', () => {
  beforeAll(async () => {
    await expectSuccess(
      createBucket({
        project_id: projectId,
        bucket_name: bucketName,
        location: 'US',
        storage_class: 'STANDARD',
        versioning_enabled: false,
        requester_pays: false,
      }),
    );
  });

  afterAll(async () => {
    await expectSuccess(deleteBucket({ bucket_name: bucketName, force: true }));
  });

  it('should update bucket labels and get metadata', async () => {
    const updateResultText = await expectSuccess(
      updateBucketLabels({
        bucket_name: bucketName,
        labels: testLabel,
      }),
    );
    expect(updateResultText.success).toBe(true);
    expect(updateResultText.updated_labels).toEqual(testLabel);

    const metadata = await expectSuccess(getBucketMetadata({ bucket_name: bucketName }));
    expect(metadata.labels).toEqual(testLabel);
  });

  it('should view IAM policy and check permissions', async () => {
    const policy = await expectSuccess(viewIamPolicy({ bucket_name: bucketName }));
    expect(policy.iam_policy.bindings).toBeDefined();

    const permissions = await expectSuccess(
      checkIamPermissions({
        bucket_name: bucketName,
        permissions: ['storage.objects.list'],
      }),
    );
    expect(permissions.allowed_permissions['storage.objects.list']).toBe(true);
  });

  it('should write, read, and delete an object', async () => {
    // Write
    const writeResult = await expectSuccess(
      writeObject({
        bucket_name: bucketName,
        object_name: testObjectName,
        content: Buffer.from(testObjectContent).toString('base64'),
      }),
    );
    expect(writeResult.success).toBe(true);

    // Read
    const readResultText = await expectSuccess(
      readObjectContent({
        bucket_name: bucketName,
        object_name: testObjectName,
      }),
    );
    expect(readResultText.content).toBe(testObjectContent);

    // Delete
    const deleteResult = await expectSuccess(
      deleteObject({
        bucket_name: bucketName,
        object_name: testObjectName,
      }),
    );
    expect(deleteResult.success).toBe(true);

    // Verify deletion
    const metadata = await expectSuccess(
      readObjectMetadata({
        bucket_name: bucketName,
        object_name: testObjectName,
      }),
    );
    expect(metadata.error_type).toBe('NotFound');
  });

  it('should upload, list, and move an object', async () => {
    // Upload
    const uploadFilePath = path.join(__dirname, testUploadFileName);
    fs.writeFileSync(uploadFilePath, testObjectContent);
    const uploadResult = await expectSuccess(
      uploadObject({
        bucket_name: bucketName,
        file_path: uploadFilePath,
      }),
    );
    expect(uploadResult.success).toBe(true);
    fs.unlinkSync(uploadFilePath);

    // List
    const listResultText = await expectSuccess(listObjects({ bucket_name: bucketName }));
    expect(listResultText.objects).toContain(testUploadFileName);

    // Move
    const moveResult = await expectSuccess(
      moveObject({
        source_bucket_name: bucketName,
        source_object_name: testUploadFileName,
        destination_bucket_name: bucketName,
        destination_object_name: movedObjectName,
      }),
    );
    expect(moveResult.success).toBe(true);

    // Verify move
    const newListResultText = await expectSuccess(listObjects({ bucket_name: bucketName }));
    expect(newListResultText.objects).toContain(movedObjectName);
    expect(newListResultText.objects).not.toContain(testUploadFileName);
  });

  it('should get bucket location', async () => {
    const resultText = await expectSuccess(getBucketLocation({ bucket_name: bucketName }));
    expect(resultText.location).toBeDefined();
    expect(typeof resultText.location).toBe('string');
  });

  it('should update object metadata', async () => {
    const objectName = 'metadata-test-object.txt';
    const customMetadata = { 'test-key': 'test-value' };

    // Write
    const writeResult = await expectSuccess(
      writeObject({
        bucket_name: bucketName,
        object_name: objectName,
        content: Buffer.from(testObjectContent).toString('base64'),
      }),
    );
    expect(writeResult.success).toBe(true);

    // Update metadata
    const updateResult = await expectSuccess(
      updateObjectMetadata({
        bucket_name: bucketName,
        object_name: objectName,
        metadata: customMetadata,
      }),
    );
    expect(updateResult.success).toBe(true);

    // Verify metadata
    const metadata = await expectSuccess(
      readObjectMetadata({
        bucket_name: bucketName,
        object_name: objectName,
      }),
    );
    expect(metadata.metadata).toEqual(customMetadata);

    // Cleanup
    const deleteResult = await expectSuccess(
      deleteObject({ bucket_name: bucketName, object_name: objectName }),
    );
    expect(deleteResult.success).toBe(true);
  });

  it('should copy an object', async () => {
    const objectName = 'copy-test-object.txt';
    const copiedObjectName = 'copied-copy-test-object.txt';

    // Write
    const writeResult = await expectSuccess(
      writeObject({
        bucket_name: bucketName,
        object_name: objectName,
        content: Buffer.from(testObjectContent).toString('base64'),
      }),
    );
    expect(writeResult.success).toBe(true);

    // Copy object
    const copyResult = await expectSuccess(
      copyObject({
        source_bucket_name: bucketName,
        source_object_name: objectName,
        destination_bucket_name: bucketName,
        destination_object_name: copiedObjectName,
      }),
    );
    expect(copyResult.success).toBe(true);

    // Verify copy
    const listResultText = await expectSuccess(listObjects({ bucket_name: bucketName }));
    expect(listResultText.objects).toContain(objectName);
    expect(listResultText.objects).toContain(copiedObjectName);

    // Cleanup
    const deleteResult1 = await expectSuccess(
      deleteObject({ bucket_name: bucketName, object_name: objectName }),
    );
    expect(deleteResult1.success).toBe(true);
    const deleteResult2 = await expectSuccess(
      deleteObject({
        bucket_name: bucketName,
        object_name: copiedObjectName,
      }),
    );
    expect(deleteResult2.success).toBe(true);
  });

  it('should download an object', async () => {
    const objectName = 'download-test-object.txt';
    const downloadFilePath = path.join(__dirname, 'downloaded-file.txt');

    // Write an object to GCS
    const writeResult = await expectSuccess(
      writeObject({
        bucket_name: bucketName,
        object_name: objectName,
        content: Buffer.from(testObjectContent).toString('base64'),
      }),
    );
    expect(writeResult.success).toBe(true);

    // Download the object
    const downloadResult = await expectSuccess(
      downloadObject({
        bucket_name: bucketName,
        object_name: objectName,
        file_path: downloadFilePath,
      }),
    );
    expect(downloadResult.success).toBe(true);

    // Verify the downloaded file
    const downloadedContent = fs.readFileSync(downloadFilePath, 'utf-8');
    expect(downloadedContent).toBe(testObjectContent);

    // Cleanup
    fs.unlinkSync(downloadFilePath);
    const deleteResult = await expectSuccess(
      deleteObject({ bucket_name: bucketName, object_name: objectName }),
    );
    expect(deleteResult.success).toBe(true);
  });

  it('should list buckets', async () => {
    const buckets = await expectSuccess(listBuckets({ project_id: projectId }));
    expect(buckets.split('\n')).toContain(bucketName);
  });
});
