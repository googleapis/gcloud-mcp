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
import { writeObject } from '../../src/tools/objects/write_object.js';
import { deleteObject } from '../../src/tools/objects/delete_object.js';
import { uploadObject } from '../../src/tools/objects/upload_object.js';
import { copyObjectSafe } from '../../src/tools/objects/copy_object_safe.js';
import * as fs from 'fs';
import * as path from 'path';
import { uploadObjectSafe } from '../../src/tools/objects/upload_object_safe.js';
import { writeObjectSafe } from '../../src/tools/objects/write_object_safe.js';

const projectId = process.env['GOOGLE_CLOUD_PROJECT'] || process.env['GCP_PROJECT_ID'];
if (!projectId) {
  throw new Error('GOOGLE_CLOUD_PROJECT or GCP_PROJECT_ID environment variable not set');
}

const bucketName = `gcs-mcp-safe-integration-test-${Date.now()}`;

describe('GCS Safe Tools Integration Tests', () => {
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

  const safeTestObjectName = 'safe-test-object.txt';
  const safeTestObjectContent = 'This is a safe test object.';
  const safeUploadFileName = 'safe-upload.txt';
  const copiedSafeTestObjectName = 'copied-safe-test-object.txt';

  it('should fail to write an object that already exists with writeObjectSafe', async () => {
    // First, write an object.
    await expectSuccess(
      writeObject({
        bucket_name: bucketName,
        object_name: safeTestObjectName,
        content: Buffer.from(safeTestObjectContent).toString('base64'),
      }),
    );

    // Then, attempt to write it again with writeObjectSafe and expect it to fail.
    const result = await writeObjectSafe({
      bucket_name: bucketName,
      object_name: safeTestObjectName,
      content: Buffer.from(safeTestObjectContent).toString('base64'),
    });
    const result_json = JSON.parse(result.content[0].text!);
    expect(result_json.error_type).toBe('AlreadyExists');

    // Clean up the object.
    await expectSuccess(
      deleteObject({
        bucket_name: bucketName,
        object_name: safeTestObjectName,
      }),
    );
  });

  it('should fail to upload an object that already exists with uploadObjectSafe', async () => {
    // First, upload an object.
    const uploadFilePath = path.join(__dirname, safeUploadFileName);
    fs.writeFileSync(uploadFilePath, safeTestObjectContent);
    await expectSuccess(
      uploadObject({
        bucket_name: bucketName,
        file_path: uploadFilePath,
        object_name: safeUploadFileName,
      }),
    );

    // Then, attempt to upload it again with uploadObjectSafe and expect it to fail.
    const result = await uploadObjectSafe({
      bucket_name: bucketName,
      file_path: uploadFilePath,
      object_name: safeUploadFileName,
    });
    const result_json = JSON.parse(result.content[0].text!);
    expect(result_json.error_type).toBe('AlreadyExists');

    // Clean up the object and local file.
    await expectSuccess(
      deleteObject({
        bucket_name: bucketName,
        object_name: safeUploadFileName,
      }),
    );
    fs.unlinkSync(uploadFilePath);
  });

  it('should fail to copy an object that already exists with copyObjectSafe', async () => {
    // First, create a source object.
    await expectSuccess(
      writeObject({
        bucket_name: bucketName,
        object_name: safeTestObjectName,
        content: Buffer.from(safeTestObjectContent).toString('base64'),
      }),
    );

    // Create a destination object.
    await expectSuccess(
      writeObject({
        bucket_name: bucketName,
        object_name: copiedSafeTestObjectName,
        content: Buffer.from(safeTestObjectContent).toString('base64'),
      }),
    );

    // Then, attempt to copy over the destination object with copyObjectSafe and expect it to fail.
    const result = await copyObjectSafe({
      source_bucket_name: bucketName,
      source_object_name: safeTestObjectName,
      destination_bucket_name: bucketName,
      destination_object_name: copiedSafeTestObjectName,
    });
    const result_json = JSON.parse(result.content[0].text!);
    expect(result_json.error_type).toBe('AlreadyExists');

    // Clean up the objects.
    await expectSuccess(
      deleteObject({
        bucket_name: bucketName,
        object_name: safeTestObjectName,
      }),
    );
    await expectSuccess(
      deleteObject({
        bucket_name: bucketName,
        object_name: copiedSafeTestObjectName,
      }),
    );
  });

  it('should successfully write a new object with writeObjectSafe', async () => {
    const newObjectName = 'new-safe-object.txt';
    await expectSuccess(
      writeObjectSafe({
        bucket_name: bucketName,
        object_name: newObjectName,
        content: Buffer.from(safeTestObjectContent).toString('base64'),
      }),
    );

    // Clean up the object.
    await expectSuccess(
      deleteObject({
        bucket_name: bucketName,
        object_name: newObjectName,
      }),
    );
  });

  it('should successfully upload a new object with uploadObjectSafe', async () => {
    const newUploadFileName = 'new-safe-upload.txt';
    const uploadFilePath = path.join(__dirname, newUploadFileName);
    fs.writeFileSync(uploadFilePath, safeTestObjectContent);

    await expectSuccess(
      uploadObjectSafe({
        bucket_name: bucketName,
        file_path: uploadFilePath,
        object_name: newUploadFileName,
      }),
    );

    // Clean up the object and local file.
    await expectSuccess(
      deleteObject({
        bucket_name: bucketName,
        object_name: newUploadFileName,
      }),
    );
    fs.unlinkSync(uploadFilePath);
  });

  it('should successfully copy to a new object with copyObjectSafe', async () => {
    // Create a source object.
    const sourceObjectName = 'source-for-safe-copy.txt';
    await expectSuccess(
      writeObject({
        bucket_name: bucketName,
        object_name: sourceObjectName,
        content: Buffer.from(safeTestObjectContent).toString('base64'),
      }),
    );

    const destinationObjectName = 'destination-for-safe-copy.txt';
    await expectSuccess(
      copyObjectSafe({
        source_bucket_name: bucketName,
        source_object_name: sourceObjectName,
        destination_bucket_name: bucketName,
        destination_object_name: destinationObjectName,
      }),
    );

    // Clean up the objects.
    await expectSuccess(
      deleteObject({
        bucket_name: bucketName,
        object_name: sourceObjectName,
      }),
    );
    await expectSuccess(
      deleteObject({
        bucket_name: bucketName,
        object_name: destinationObjectName,
      }),
    );
  });
});
