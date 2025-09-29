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

import { FileMetadata } from '@google-cloud/storage';
import mime from 'mime';

// The maximum size of a file that can be read into memory, in bytes.
export const MAX_CONTENT_SIZE = 20 * 1024 * 1024; // 20MB

// The threshold at which to warn the user about large files, in bytes.
export const STREAMING_THRESHOLD = 10 * 1024 * 1024; // 10MB

/**
 * Represents the metadata for a Google Cloud Storage object.
 * This is a subset of the full metadata available from the API.
 */
export interface GCSObjectMeta {
  kind: 'storage#object';
  id: string;
  name: string;
  bucket: string;
  generation: string;
  contentType: string;
  timeCreated: string;
  updated: string;
  storageClass: string;
  size: string;
  md5Hash: string;
  crc32c: string;
  etag: string;
}

/**
 * Represents the response from the GCS API when listing objects.
 * This is a subset of the full response available from the API.
 */
export interface GCSListObjectsResponse {
  kind: 'storage#objects';
  items?: GCSObjectMeta[];
  prefixes?: string[];
}

export const getContentType = (object_name: string) =>
  mime.getType(object_name) || 'application/octet-stream';

export const formatGCSObjectMetaResponse = (metadata: GCSObjectMeta) => ({
  bucket: metadata.bucket,
  object: metadata.name,
  size: Number(metadata.size),
  content_type: metadata.contentType,
  time_created: metadata.timeCreated,
  updated: metadata.updated,
  storage_class: metadata.storageClass,
});

export const formatFileMetadataResponse = (metadata: FileMetadata) => ({
  bucket: metadata.bucket,
  object: metadata.name,
  size: Number(metadata.size),
  content_type: metadata.contentType,
  time_created: metadata.timeCreated,
  updated: metadata.updated,
  storage_class: metadata.storageClass,
  metadata: metadata.metadata,
});

export const validateBase64Content = (content: string) => {
  // Basic check for base64 validity
  if (!/^[A-Za-z0-9+/=]*$/.test(content)) {
    throw new Error('Content is not valid base64.');
  }
  return true;
};
