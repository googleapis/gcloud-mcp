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

import * as fs from 'fs';
import * as path from 'path';

let _baseDir: string | undefined;

/** Sets the base directory for local path validation. */
export function setPathBaseDir(dir: string | undefined) {
  _baseDir = dir;
}

/** Returns the configured base directory, or undefined if unrestricted. */
export function getPathBaseDir(): string | undefined {
  return _baseDir;
}

/**
 * Resolves a file path and checks it stays within the given base directory.
 */
export function validateLocalPath(filePath: string, baseDir: string): string {
  const base = path.resolve(baseDir);
  const resolved = path.resolve(base, filePath);
  const prefix = base + path.sep;

  if (resolved !== base && !resolved.startsWith(prefix)) {
    throw new Error(`path escapes base dir: ${resolved}`);
  }

  // Best-effort symlink check; there is a TOCTOU gap between this and the
  // caller's read/write, but it covers the common case.
  if (fs.existsSync(resolved)) {
    const real = fs.realpathSync(resolved);
    if (real !== base && !real.startsWith(prefix)) {
      throw new Error(`symlink target escapes base dir: ${real}`);
    }
  }

  return resolved;
}
