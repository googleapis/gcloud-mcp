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
import { readObjectContent } from '../../src/tools/objects/read_object_content.js';
import { deleteObject } from '../../src/tools/objects/delete_object.js';
import { uploadObject } from '../../src/tools/objects/upload_object.js';
import * as fs from 'fs';
import * as path from 'path';

const projectId = process.env['GOOGLE_CLOUD_PROJECT'] || process.env['GCP_PROJECT_ID'];
if (!projectId) {
  throw new Error('GOOGLE_CLOUD_PROJECT or GCP_PROJECT_ID environment variable not set');
}

const mimeTypeBucketName = `storage-mcp-mime-type-test-${Date.now()}`;

describe('readObjectContent MIME type tests', () => {
  beforeAll(async () => {
    await expectSuccess(
      createBucket({
        project_id: projectId,
        bucket_name: mimeTypeBucketName,
        location: 'US',
        storage_class: 'STANDARD',
        versioning_enabled: false,
        requester_pays: false,
      }),
    );
  });

  afterAll(async () => {
    await expectSuccess(deleteBucket({ bucket_name: mimeTypeBucketName, force: true }));
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
      const uploadResult = await expectSuccess(
        uploadObject({
          bucket_name: mimeTypeBucketName,
          file_path: filePath,
          object_name: file.name,
          content_type: file.contentType,
        }),
      );
      expect(uploadResult.success).toBe(true);

      // Read the object content
      const readResult = await expectSuccess(
        readObjectContent({
          bucket_name: mimeTypeBucketName,
          object_name: file.name,
        }),
      );

      if (file.unsupported) {
        expect(readResult.error_type).toBe('UnsupportedContentType');
      } else if (file.shouldBeText) {
        expect(readResult.content).toBe(file.content);
        expect(readResult.content_type).toBe(file.contentType);
      } else {
        // For binary files, the `expectSuccess` helper returns a `resource` object.
        // This part of the helper is used here to handle the binary content.
        expect(readResult.mimeType).toBe(file.contentType);
        expect(readResult.blob).toBeDefined();
      }

      // Cleanup the object
      const deleteResult = await expectSuccess(
        deleteObject({ bucket_name: mimeTypeBucketName, object_name: file.name }),
      );
      expect(deleteResult.success).toBe(true);
    });
  });
});
