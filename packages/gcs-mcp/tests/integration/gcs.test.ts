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
    const result = await createBucket({
      project_id: projectId,
      bucket_name: bucketName,
      location: 'US',
      storage_class: 'STANDARD',
      versioning_enabled: false,
      requester_pays: false,
    });
    if (!result?.content?.[0]?.text) {
      throw new Error('Create bucket failed');
    }
    const resultText = JSON.parse(result.content[0].text as string);
    if (!resultText.success) {
      throw new Error(`Create bucket failed: ${resultText.error}`);
    }
    expect(resultText.success).toBe(true);
  });

  afterAll(async () => {
    const result = await deleteBucket({ bucket_name: bucketName, force: true });
    if (!result?.content?.[0]?.text) {
      throw new Error('Delete bucket failed');
    }
    const resultText = JSON.parse(result.content[0].text as string);
    if (!resultText.success) {
      throw new Error(`Delete bucket failed: ${resultText.error}`);
    }
    expect(resultText.success).toBe(true);
  });

  it('should update bucket labels and get metadata', async () => {
    const updateResult = await updateBucketLabels({
      bucket_name: bucketName,
      labels: testLabel,
    });
    if (!updateResult?.content?.[0]?.text) {
      throw new Error('Update bucket labels failed');
    }
    const updateResultText = JSON.parse(updateResult.content[0].text as string);
    expect(updateResultText.success).toBe(true);
    expect(updateResultText.updated_labels).toEqual(testLabel);

    const metadataResult = await getBucketMetadata({ bucket_name: bucketName });
    if (!metadataResult?.content?.[0]?.text) {
      throw new Error('Get bucket metadata failed');
    }
    const metadata = JSON.parse(metadataResult.content[0].text as string);
    expect(metadata.labels).toEqual(testLabel);
  });

  it('should view IAM policy and check permissions', async () => {
    const policyResult = await viewIamPolicy({ bucket_name: bucketName });
    if (!policyResult?.content?.[0]?.text) {
      throw new Error('View IAM policy failed');
    }
    const policy = JSON.parse(policyResult.content[0].text as string);
    expect(policy.iam_policy.bindings).toBeDefined();

    const permissionsResult = await checkIamPermissions({
      bucket_name: bucketName,
      permissions: ['storage.objects.list'],
    });
    if (!permissionsResult?.content?.[0]?.text) {
      throw new Error('Check IAM permissions failed');
    }
    const permissions = JSON.parse(permissionsResult.content[0].text as string);
    expect(permissions.allowed_permissions['storage.objects.list']).toBe(true);
  });

  it('should write, read, and delete an object', async () => {
    // Write
    const writeResult = await writeObject({
      bucket_name: bucketName,
      object_name: testObjectName,
      content: Buffer.from(testObjectContent).toString('base64'),
    });
    if (!writeResult?.content?.[0]?.text) {
      throw new Error('Write object failed');
    }
    const writeResultText = JSON.parse(writeResult.content[0].text as string);
    expect(writeResultText.success).toBe(true);

    // Read
    const readResult = await readObjectContent({
      bucket_name: bucketName,
      object_name: testObjectName,
    });
    if (!readResult?.content?.[0]?.text) {
      throw new Error('Read object content failed');
    }
    const readResultText = JSON.parse(readResult.content[0].text as string);
    expect(readResultText.content).toBe(testObjectContent);

    // Delete
    const deleteResult = await deleteObject({
      bucket_name: bucketName,
      object_name: testObjectName,
    });
    if (!deleteResult?.content?.[0]?.text) {
      throw new Error('Delete object failed');
    }
    const deleteResultText = JSON.parse(deleteResult.content[0].text as string);
    expect(deleteResultText.success).toBe(true);

    // Verify deletion
    const metadataResult = await readObjectMetadata({
      bucket_name: bucketName,
      object_name: testObjectName,
    });
    if (!metadataResult?.content?.[0]?.text) {
      throw new Error('Read object metadata failed');
    }
    const metadata = JSON.parse(metadataResult.content[0].text as string);
    expect(metadata.error_type).toBe('NotFound');
  });

  it('should upload, list, and move an object', async () => {
    // Upload
    const uploadFilePath = path.join(__dirname, testUploadFileName);
    fs.writeFileSync(uploadFilePath, testObjectContent);
    const uploadResult = await uploadObject({
      bucket_name: bucketName,
      file_path: uploadFilePath,
    });
    if (!uploadResult?.content?.[0]?.text) {
      throw new Error('Upload object failed');
    }
    const uploadResultText = JSON.parse(uploadResult.content[0].text as string);
    expect(uploadResultText.success).toBe(true);
    fs.unlinkSync(uploadFilePath);

    // List
    const listResult = await listObjects({ bucket_name: bucketName });
    if (!listResult?.content?.[0]?.text) {
      throw new Error('List objects failed');
    }
    const listResultText = JSON.parse(listResult.content[0].text as string);
    expect(listResultText.objects).toContain(testUploadFileName);

    // Move
    const moveResult = await moveObject({
      source_bucket_name: bucketName,
      source_object_name: testUploadFileName,
      destination_bucket_name: bucketName,
      destination_object_name: movedObjectName,
    });
    if (!moveResult?.content?.[0]?.text) {
      throw new Error('Move object failed');
    }
    const moveResultText = JSON.parse(moveResult.content[0].text as string);
    expect(moveResultText.success).toBe(true);

    // Verify move
    const newListResult = await listObjects({ bucket_name: bucketName });
    if (!newListResult?.content?.[0]?.text) {
      throw new Error('List objects after move failed');
    }
    const newListResultText = JSON.parse(newListResult.content[0].text as string);
    expect(newListResultText.objects).toContain(movedObjectName);
    expect(newListResultText.objects).not.toContain(testUploadFileName);
  });

  it('should get bucket location', async () => {
    const result = await getBucketLocation({ bucket_name: bucketName });
    if (!result?.content?.[0]?.text) {
      throw new Error('Get bucket location failed');
    }
    const resultText = JSON.parse(result.content[0].text as string);
    expect(resultText.location).toBeDefined();
    expect(typeof resultText.location).toBe('string');
  });

  it('should update object metadata', async () => {
    const objectName = 'metadata-test-object.txt';
    const customMetadata = { 'test-key': 'test-value' };

    // Write
    const writeResult = await writeObject({
      bucket_name: bucketName,
      object_name: objectName,
      content: Buffer.from(testObjectContent).toString('base64'),
    });
    if (!writeResult?.content?.[0]?.text) {
      throw new Error('Write object for metadata test failed');
    }
    const writeResultText = JSON.parse(writeResult.content[0].text as string);
    expect(writeResultText.success).toBe(true);

    // Update metadata
    const updateResult = await updateObjectMetadata({
      bucket_name: bucketName,
      object_name: objectName,
      metadata: customMetadata,
    });
    if (!updateResult?.content?.[0]?.text) {
      throw new Error('Update object metadata failed');
    }
    const updateResultText = JSON.parse(updateResult.content[0].text as string);
    expect(updateResultText.success).toBe(true);

    // Verify metadata
    const metadataResult = await readObjectMetadata({
      bucket_name: bucketName,
      object_name: objectName,
    });
    if (!metadataResult?.content?.[0]?.text) {
      throw new Error('Read object metadata for verification failed');
    }
    const metadata = JSON.parse(metadataResult.content[0].text as string);
    expect(metadata.metadata).toEqual(customMetadata);

    // Cleanup
    await deleteObject({ bucket_name: bucketName, object_name: objectName });
  });

  it('should copy an object', async () => {
    const objectName = 'copy-test-object.txt';
    const copiedObjectName = 'copied-copy-test-object.txt';

    // Write
    const writeResult = await writeObject({
      bucket_name: bucketName,
      object_name: objectName,
      content: Buffer.from(testObjectContent).toString('base64'),
    });
    if (!writeResult?.content?.[0]?.text) {
      throw new Error('Write object for copy test failed');
    }
    const writeResultText = JSON.parse(writeResult.content[0].text as string);
    expect(writeResultText.success).toBe(true);

    // Copy object
    const copyResult = await copyObject({
      source_bucket_name: bucketName,
      source_object_name: objectName,
      destination_bucket_name: bucketName,
      destination_object_name: copiedObjectName,
    });
    if (!copyResult?.content?.[0]?.text) {
      throw new Error('Copy object failed');
    }
    const copyResultText = JSON.parse(copyResult.content[0].text as string);
    expect(copyResultText.success).toBe(true);

    // Verify copy
    const listResult = await listObjects({ bucket_name: bucketName });
    if (!listResult?.content?.[0]?.text) {
      throw new Error('List objects for copy verification failed');
    }
    const listResultText = JSON.parse(listResult.content[0].text as string);
    expect(listResultText.objects).toContain(objectName);
    expect(listResultText.objects).toContain(copiedObjectName);

    // Cleanup
    await deleteObject({ bucket_name: bucketName, object_name: objectName });
    await deleteObject({
      bucket_name: bucketName,
      object_name: copiedObjectName,
    });
  });

  it('should download an object', async () => {
    const objectName = 'download-test-object.txt';
    const downloadFilePath = path.join(__dirname, 'downloaded-file.txt');

    // Write an object to GCS
    const writeResult = await writeObject({
      bucket_name: bucketName,
      object_name: objectName,
      content: Buffer.from(testObjectContent).toString('base64'),
    });
    if (!writeResult?.content?.[0]?.text) {
      throw new Error('Write object for download test failed');
    }
    const writeResultText = JSON.parse(writeResult.content[0].text as string);
    expect(writeResultText.success).toBe(true);

    // Download the object
    const downloadResult = await downloadObject({
      bucket_name: bucketName,
      object_name: objectName,
      file_path: downloadFilePath,
    });
    if (!downloadResult?.content?.[0]?.text) {
      throw new Error('Download object failed');
    }
    const downloadResultText = JSON.parse(downloadResult.content[0].text as string);
    expect(downloadResultText.success).toBe(true);

    // Verify the downloaded file
    const downloadedContent = fs.readFileSync(downloadFilePath, 'utf-8');
    expect(downloadedContent).toBe(testObjectContent);

    // Cleanup
    fs.unlinkSync(downloadFilePath);
    await deleteObject({ bucket_name: bucketName, object_name: objectName });
  });
});

const mimeTypeBucketName = `gcs-mcp-mime-type-test-${Date.now()}`;

describe('readObjectContent MIME type tests', () => {
  beforeAll(async () => {
    const result = await createBucket({
      project_id: projectId,
      bucket_name: mimeTypeBucketName,
      location: 'US',
      storage_class: 'STANDARD',
      versioning_enabled: false,
      requester_pays: false,
    });
    if (!result?.content?.[0]?.text) {
      throw new Error('Create bucket failed');
    }
    const resultText = JSON.parse(result.content[0].text as string);
    if (!resultText.success) {
      throw new Error(`Create bucket failed: ${resultText.error}`);
    }
    expect(resultText.success).toBe(true);
  });

  afterAll(async () => {
    const result = await deleteBucket({ bucket_name: mimeTypeBucketName, force: true });
    if (!result?.content?.[0]?.text) {
      throw new Error('Delete bucket failed');
    }
    const resultText = JSON.parse(result.content[0].text as string);
    if (!resultText.success) {
      throw new Error(`Delete bucket failed: ${resultText.error}`);
    }
    expect(resultText.success).toBe(true);
  });
  const testFiles = [
    {
      name: 'test.txt',
      content: 'This is a text file.',
      contentType: 'text/plain',
      shouldBeText: true,
    },
    {
      name: 'test.json',
      content: '{"key": "value"}',
      contentType: 'application/json',
      shouldBeText: true,
    },
    {
      name: 'test.xml',
      content: '<root><child>value</child></root>',
      contentType: 'application/xml',
      shouldBeText: true,
    },
    {
      name: 'test.png',
      content:
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
      contentType: 'image/png',
      shouldBeText: false,
    },
    {
      name: 'test.zip',
      content:
        'UEsDBAoAAAAAAACp/1MAAAAAAAAAAAAAAAwDAAAAAFRFU1QudHh0VVQJAAMHo35lB6N+ZXV4CwABBPUBAAAEFAAAAE9iamVjdCBjb250ZW50UEsBAh4DCgAAAAAAAKn/UwAAAAAAAAAAAAAAAAwDAAAAAFRFU1QudHh0VVQFAAMHo35ldXgLAAEE9QEAAAQUAAAAUEsFBgAAAAABAAEATgAAAEcAAAAAAA==',
      contentType: 'application/zip',
      shouldBeText: false,
      unsupported: true,
    },
    {
      name: 'test.bin',
      content: 'c29tZWJpbmFyeWRhdGE=',
      contentType: 'application/octet-stream',
      shouldBeText: false,
      unsupported: true,
    },
    {
      name: 'test.gif',
      content: 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      contentType: 'image/gif',
      shouldBeText: false,
      unsupported: true,
    },
  ];

  beforeAll(() => {
    testFiles.forEach((file) => {
      const filePath = path.join(__dirname, file.name);
      const content = !file.shouldBeText ? Buffer.from(file.content, 'base64') : file.content;
      fs.writeFileSync(filePath, content);
    });
  });

  afterAll(() => {
    testFiles.forEach((file) => {
      const filePath = path.join(__dirname, file.name);
      fs.unlinkSync(filePath);
    });
  });

  testFiles.forEach((file) => {
    it(`should handle ${file.name} (${file.contentType})`, async () => {
      const filePath = path.join(__dirname, file.name);

      // Upload the file
      const uploadResult = await uploadObject({
        bucket_name: mimeTypeBucketName,
        file_path: filePath,
        object_name: file.name,
        content_type: file.contentType,
      });
      if (!uploadResult?.content?.[0]?.text) {
        throw new Error('Upload object failed');
      }
      const uploadResultText = JSON.parse(uploadResult.content[0].text as string);
      expect(uploadResultText.success).toBe(true);

      // Read the object content
      const readResult = await readObjectContent({
        bucket_name: mimeTypeBucketName,
        object_name: file.name,
      });
      if (!readResult?.content?.[0]) {
        throw new Error('Read object content failed');
      }

      if (file.unsupported) {
        const readResultText = JSON.parse(readResult.content[0].text as string);
        expect(readResultText.error_type).toBe('UnsupportedContentType');
      } else if (file.shouldBeText) {
        const readResultText = JSON.parse(readResult.content[0].text as string);
        expect(readResultText.content).toBe(file.content);
        expect(readResultText.content_type).toBe(file.contentType);
      } else {
        // For binary files, we expect a resource object
        const resourceResult = readResult.content[0];
        if (resourceResult.type === 'resource') {
          expect(resourceResult.resource.mimeType).toBe(file.contentType);
          expect(resourceResult.resource.blob).toBeDefined();
        }
      }

      // Cleanup the object
      await deleteObject({ bucket_name: mimeTypeBucketName, object_name: file.name });
    });
  });
});
