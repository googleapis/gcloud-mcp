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

import chardet from 'chardet';
import iconv from 'iconv-lite';
const { decode } = iconv;
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { apiClientFactory } from '../../utility/index.js';
import { MAX_CONTENT_SIZE } from '../../utility/gcs_helpers.js';
import { detectBufferType } from '../../utility/file_type_detector.js';
import { logger } from '../../utility/logger.js';

const inputSchema = {
  bucket_name: z.string().describe('The name of the GCS bucket.'),
  object_name: z.string().describe('The name of the object.'),
};

// For non-text files, check against a list of supported MIME types.
// See https://cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/2-5-pro
const supportedMimeTypes = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/pdf',
  'video/x-flv',
  'video/quicktime',
  'video/mpeg',
  'video/mpegs',
  'video/mpg',
  'video/mp4',
  'video/webm',
  'video/wmv',
  'video/3gpp',
  'audio/x-aac',
  'audio/flac',
  'audio/mp3',
  'audio/m4a',
  'audio/mpeg',
  'audio/mpga',
  'audio/mp4',
  'audio/opus',
  'audio/pcm',
  'audio/wav',
  'audio/webm',
];

type ReadObjectContentParams = z.infer<z.ZodObject<typeof inputSchema>>;

export async function readObjectContent(params: ReadObjectContentParams): Promise<CallToolResult> {
  try {
    logger.info(
      `Reading content for object: ${params.object_name} in bucket: ${params.bucket_name}`,
    );
    const storage = apiClientFactory.getStorageClient();

    const file = storage.bucket(params.bucket_name).file(params.object_name);
    const [metadata] = await file.get();
    const size = Number(metadata.metadata.size);
    const contentType = metadata.metadata.contentType || 'application/octet-stream';

    // Handle size constraints before downloading
    if (size > MAX_CONTENT_SIZE) {
      const errorMsg = `Object ${params.object_name} is too large (${size} bytes) to read into memory. Maximum size is ${MAX_CONTENT_SIZE} bytes.`;
      logger.error(errorMsg);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: errorMsg,
              error_type: 'ContentTooLarge',
            }),
          },
        ],
      };
    }

    const [buffer] = await file.download();
    const detectedType = detectBufferType(buffer, contentType, params.object_name);
    let encoding = chardet.detect(buffer);

    if (detectedType === 'text' && contentType !== 'application/octet-stream') {
      try {
        // Default to text encoding utf-8 if chardet couldn't figure it out.
        // We trust that detectBufferType has is correct in guessing 'text'.
        encoding = encoding || 'utf-8';
        const content = decode(buffer, encoding);
        const result = {
          bucket: params.bucket_name,
          object: params.object_name,
          size,
          content_type: contentType,
          content,
        };
        logger.info(
          `Successfully read text content for object ${params.object_name} (${size} bytes) with detected encoding ${encoding}`,
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        // If decoding fails, fall through to treat as a raw resource.
        logger.warn(
          `Failed to decode ${params.object_name} as text with detected encoding ${encoding}, treating as raw resource. Error: ${error}`,
        );
      }
    }

    if (!supportedMimeTypes.includes(contentType)) {
      const errorMsg = `Unsupported content type: ${contentType}.`;
      logger.error(errorMsg);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: errorMsg,
              error_type: 'UnsupportedContentType',
            }),
          },
        ],
      };
    }

    // Treat supported non-text (or text that failed to decode) as a raw resource
    const contentBase64 = buffer.toString('base64');
    logger.info(`Successfully read raw content for object ${params.object_name} (${size} bytes)`);
    return {
      content: [
        {
          message: `Successfully read raw content for object ${params.object_name} (${size} bytes)`,
          type: 'resource',
          resource: {
            uri: `gcs://${params.bucket_name}/${params.object_name}`,
            mimeType: contentType,
            blob: contentBase64,
          },
        },
      ],
    };
  } catch (e: unknown) {
    const error = e as Error;
    let errorType = 'Unknown';
    if (error.message.includes('Not Found')) {
      errorType = 'NotFound';
    } else if (error.message.includes('Forbidden')) {
      errorType = 'Forbidden';
    }
    const errorMsg = `Error reading object content: ${error.message}`;
    logger.error(errorMsg);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ error: errorMsg, error_type: errorType }),
        },
      ],
    };
  }
}

export const registerReadObjectContentTool = (server: McpServer) => {
  server.registerTool(
    'read_object_content',
    {
      description: 'Reads the content of a specific object.',
      inputSchema,
    },
    readObjectContent,
  );
};
