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

import { execSync } from 'child_process';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { Storage } from '@google-cloud/storage';

// Helper function to execute a Gemini CLI command
const runGeminiCommand = (prompt: string): string => {
  const command = `gemini --yolo -p "${prompt}"`;
  // Increased timeout for GCS operations
  const result = execSync(command, { encoding: 'utf-8', timeout: 300000 });
  return result;
};

const projectId = process.env['GOOGLE_CLOUD_PROJECT'] || process.env['GCP_PROJECT_ID'];
if (!projectId) {
  throw new Error('GOOGLE_CLOUD_PROJECT or GCP_PROJECT_ID environment variable not set');
}
const storage = new Storage({ projectId });

/**
 * ===================================================================================
 * E2E TEST: GCS Agentic Workflow Validation
 * ===================================================================================
 */

describe('GCS Agentic Workflows: Full Resource Lifecycle', () => {
  const bucketName = `gemini-e2e-lifecycle-${Date.now()}`;
  const localFileName = 'test-upload.txt';
  const objectName = 'test-upload.txt';
  const fileContent = 'hello gcs!';
  const localFilePath = path.join(os.tmpdir(), localFileName);

  beforeAll(() => {
    fs.writeFileSync(localFilePath, fileContent);
  });

  afterAll(async () => {
    if (fs.existsSync(localFilePath)) fs.unlinkSync(localFilePath);
    await storage.bucket(bucketName).delete({ ignoreNotFound: true });
  });

  it('should create a bucket, upload, read, delete an object, and delete the bucket', async () => {
    runGeminiCommand(
      `In project '${projectId}', create a new GCS bucket named '${bucketName}' in the US-CENTRAL1 region.`,
    );
    const [bucketExists] = await storage.bucket(bucketName).exists();
    expect(bucketExists).toBe(true);

    runGeminiCommand(
      `Upload the local file '${localFilePath}' to the '${bucketName}' bucket in project '${projectId}'.`,
    );
    const [objectExists] = await storage.bucket(bucketName).file(objectName).exists();
    expect(objectExists).toBe(true);

    const readResponse = runGeminiCommand(
      `Read the content of the '${objectName}' object from the '${bucketName}' bucket in project '${projectId}'.`,
    );
    expect(readResponse).toContain(fileContent);

    runGeminiCommand(
      `Delete the '${objectName}' object from the '${bucketName}' bucket in project '${projectId}'.`,
    );
    const [objectStillExists] = await storage.bucket(bucketName).file(objectName).exists();
    expect(objectStillExists).toBe(false);

    runGeminiCommand(`Delete the GCS bucket named '${bucketName}' in project '${projectId}'.`);
    const [bucketStillExists] = await storage.bucket(bucketName).exists();
    expect(bucketStillExists).toBe(false);
  });
});

describe('GCS Agentic Workflows: Metadata Modification', () => {
  const bucketName = `gemini-e2e-metadata-${Date.now()}`;
  const objectName = 'metadata-test.json';

  beforeAll(async () => {
    await storage.createBucket(bucketName);
    await storage.bucket(bucketName).file(objectName).save('{}');
  });

  afterAll(async () => {
    await storage.bucket(bucketName).delete({ ignoreNotFound: true });
  });

  it('should update an objects metadata', async () => {
    runGeminiCommand(
      `In project '${projectId}', update the metadata for the object '${objectName}' in the bucket '${bucketName}' to include a new custom metadata key 'review-status' with the value 'approved'.`,
    );

    const [metadata] = await storage.bucket(bucketName).file(objectName).getMetadata();
    expect(metadata.metadata).toBeDefined();
    expect(metadata.metadata!['review-status']).toEqual('approved');
  });
});

describe('GCS Agentic Workflows: Data Organization', () => {
  const bucketName = `gemini-e2e-movement-${Date.now()}`;
  const sourceObjectName = 'source-file.log';
  const backupObjectName = 'source-file-backup.log';
  const movedObjectName = 'archive/source-file.log';

  beforeAll(async () => {
    await storage.createBucket(bucketName);
    await storage.bucket(bucketName).file(sourceObjectName).save('log data');
  });

  afterAll(async () => {
    try {
      await storage.bucket(bucketName).delete({ ignoreNotFound: true });
    } catch (_e) {}
  });

  it('should copy an object', async () => {
    runGeminiCommand(
      `In project '${projectId}', copy the object '${sourceObjectName}' to a new object named '${backupObjectName}' within the same bucket '${bucketName}'.`,
    );

    const [sourceExists] = await storage.bucket(bucketName).file(sourceObjectName).exists();
    const [backupExists] = await storage.bucket(bucketName).file(backupObjectName).exists();
    expect(sourceExists).toBe(true);
    expect(backupExists).toBe(true);
  });

  it('should move an object', async () => {
    runGeminiCommand(
      `In project '${projectId}', move the object '${sourceObjectName}' to '${movedObjectName}' within the bucket '${bucketName}'.`,
    );

    const [originalExists] = await storage.bucket(bucketName).file(sourceObjectName).exists();
    const [movedExists] = await storage.bucket(bucketName).file(movedObjectName).exists();
    expect(originalExists).toBe(false);
    expect(movedExists).toBe(true);
  });
});

describe('GCS Agentic Workflows: IAM and Permissions', () => {
  const bucketName = `gemini-e2e-iam-${Date.now()}`;

  beforeAll(async () => {
    await storage.createBucket(bucketName);
  });

  afterAll(async () => {
    try {
      await storage.bucket(bucketName).delete({ ignoreNotFound: true });
    } catch (_e) {}
  });

  it('should correctly extract specific information from an IAM policy', async () => {
    const [policy] = await storage.bucket(bucketName).iam.getPolicy();
    const etag = policy.etag;

    const response = runGeminiCommand(
      `In project '${projectId}', what is the etag for the IAM policy on the bucket '${bucketName}'?`,
    );

    expect(response).toContain(etag);
  });

  it('should correctly answer a yes/no question about permissions', async () => {
    const response = runGeminiCommand(
      `In project '${projectId}', do I have the 'storage.objects.create' and 'storage.objects.list' permissions on the bucket '${bucketName}'? Please answer with just 'yes' or 'no'.`,
    );

    expect(response.toLowerCase().trim()).contain('yes');
  });
});

describe('GCS Agentic Workflows: Multi-Factor Search', () => {
  const bucketName = `gemini-e2e-multifactor-search-${Date.now()}`;
  const targetObjectName = 'archive_notes.md';
  const metadataDecoyName = 'chimera_project_plan.txt';

  beforeAll(async () => {
    await storage.createBucket(bucketName);
    const bucket = storage.bucket(bucketName);

    // Upload decoy files
    await bucket.file('log_2025_09_26.txt').save('INFO: System startup complete.');
    await bucket.file('data_export_alpha.csv').save('id,value\n1,alpha');

    // Upload metadata decoy (correct metadata, wrong content)
    await bucket.file(metadataDecoyName).save('Initial planning document for Project Chimera.', {
      metadata: { metadata: { project: 'chimera' } },
    });

    // Upload target object (correct metadata, correct content)
    await bucket
      .file(targetObjectName)
      .save('Meeting notes from Q3 review. Project Chimera Activation Code: XZ-459-PQ.', {
        metadata: { metadata: { project: 'chimera' } },
      });
  });

  afterAll(async () => {
    // Use force delete to remove the bucket and all its objects.
    await storage.bucket(bucketName).delete({ ignoreNotFound: true });
  });

  it('should find the correct object using content and metadata clues', async () => {
    const prompt = `In project '${projectId}', I need to find the activation code for 'Project Chimera'. It's in an object in the bucket '${bucketName}'. Can you find the object that contains the activation code and tell me the name of the object and the activation code?`;
    const response = runGeminiCommand(prompt);

    // The agent should identify the correct file.
    expect(response).toContain(targetObjectName);
    expect(response).toContain('XZ-459-PQ');
  });
});
