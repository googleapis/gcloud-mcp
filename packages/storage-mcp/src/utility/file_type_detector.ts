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

import * as path from 'path';

export type DetectedBufferType = 'text' | 'image' | 'pdf' | 'audio' | 'video' | 'binary' | 'svg';

type UnicodeEncoding = 'utf8' | 'utf16le' | 'utf16be' | 'utf32le' | 'utf32be';

interface BOMInfo {
  encoding: UnicodeEncoding;
  bomLength: number;
}

/**
 * Detect a Unicode BOM (Byte Order Mark) if present.
 */
function detectBOM(buf: Buffer): BOMInfo | null {
  if (buf.length >= 4) {
    // UTF-32 LE: FF FE 00 00
    if (buf[0] === 0xff && buf[1] === 0xfe && buf[2] === 0x00 && buf[3] === 0x00) {
      return { encoding: 'utf32le', bomLength: 4 };
    }
    // UTF-32 BE: 00 00 FE FF
    if (buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0xfe && buf[3] === 0xff) {
      return { encoding: 'utf32be', bomLength: 4 };
    }
  }
  if (buf.length >= 3) {
    // UTF-8: EF BB BF
    if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
      return { encoding: 'utf8', bomLength: 3 };
    }
  }
  if (buf.length >= 2) {
    // UTF-16 LE: FF FE  (but not UTF-32 LE already matched above)
    if (
      buf[0] === 0xff &&
      buf[1] === 0xfe &&
      (buf.length < 4 || buf[2] !== 0x00 || buf[3] !== 0x00)
    ) {
      return { encoding: 'utf16le', bomLength: 2 };
    }
    // UTF-16 BE: FE FF
    if (buf[0] === 0xfe && buf[1] === 0xff) {
      return { encoding: 'utf16be', bomLength: 2 };
    }
  }
  return null;
}

/**
 * Heuristic: determine if a buffer is likely binary.
 */
function isBufferBinary(buffer: Buffer): boolean {
  const fileSize = buffer.length;
  if (fileSize === 0) return false; // empty is not binary

  // Sample up to 4KB from the head.
  const sampleSize = Math.min(4096, fileSize);
  const buf = buffer.subarray(0, sampleSize);

  // BOM → text (avoid false positives for UTF‑16/32 with nulls)
  const bom = detectBOM(buf);
  if (bom) return false;

  let nonPrintableCount = 0;
  for (let i = 0; i < sampleSize; i++) {
    const byte = buf[i] as number;
    if (byte === 0) return true; // strong indicator of binary when no BOM
    if (byte < 9 || (byte > 13 && byte < 32)) {
      nonPrintableCount++;
    }
  }
  // If >30% non-printable characters, consider it binary
  return nonPrintableCount / sampleSize > 0.3;
}

const BINARY_EXTENSIONS = [
  // Compressed
  '.zip',
  '.gz',
  '.tar',
  '.rar',
  '.7z',
  // Executable/Binary
  '.exe',
  '.dll',
  '.so',
  '.class',
  '.jar',
  '.war',
  '.ear',
  '.bin',
  // Images
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.bmp',
  '.tiff',
  '.webp',
  // Video
  '.mp4',
  '.avi',
  '.mov',
  '.wmv',
  '.mkv',
  // Audio
  '.mp3',
  '.wav',
  '.ogg',
  '.flac',
  // Docs
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  // Other
  '.pkg',
  '.dmg',
  '.iso',
];

/**
 * Detects the file type of a buffer using metadata and content sniffing,
 *
 * @param buffer The content buffer to analyze.
 * @param contentType The MIME type (e.g., from GCS metadata).
 * @param fileName The object's name (for extension checking).
 * @returns {DetectedBufferType} The detected file type.
 */
export function detectBufferType(
  buffer: Buffer,
  contentType: string,
  fileName: string,
): DetectedBufferType {
  const extension = path.extname(fileName).toLowerCase();

  // The mimetype for various TypeScript extensions can be a video format,
  // so we explicitly check for them first.
  if (['.ts', '.mts', '.cts'].includes(extension)) {
    return 'text';
  }

  if (extension === '.svg') {
    return 'svg';
  }

  if (contentType) {
    if (contentType === 'image/svg+xml') {
      return 'svg'; // Special case: image/svg+xml is text-based
    }
    if (contentType.startsWith('image/')) {
      return 'image';
    }
    if (contentType.startsWith('audio/')) {
      return 'audio';
    }
    if (contentType.startsWith('video/')) {
      return 'video';
    }
    if (contentType === 'application/pdf') {
      return 'pdf';
    }
    if (contentType.startsWith('text/')) {
      return 'text';
    }
  }

  // Stricter binary check for common non-text extensions
  if (BINARY_EXTENSIONS.includes(extension)) {
    // This will catch .zip, .pdf, .docx, etc.
    // We re-check for PDF in case contentType was missing
    if (extension === '.pdf') {
      return 'pdf';
    }
    return 'binary';
  }

  // Fall back to content-based check
  if (isBufferBinary(buffer)) {
    return 'binary';
  }

  // If all else fails, assume text.
  return 'text';
}
