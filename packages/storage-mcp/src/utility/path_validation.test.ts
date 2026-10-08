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

/// <reference types="vitest/globals" />
import { describe, it, expect, vi, afterEach } from 'vitest';
import { validateLocalPath, setPathBaseDir, getPathBaseDir } from './path_validation.js';
import * as path from 'path';
import * as fs from 'fs';

vi.mock('fs');

describe('validateLocalPath', () => {
  const base = '/home/user/project';

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should accept a relative path inside the base', () => {
    (fs.existsSync as vi.Mock).mockReturnValue(false);
    const result = validateLocalPath('data/file.txt', base);
    expect(result).toBe(path.resolve(base, 'data/file.txt'));
  });

  it('should accept a file directly in the base', () => {
    (fs.existsSync as vi.Mock).mockReturnValue(false);
    const result = validateLocalPath('file.txt', base);
    expect(result).toBe(path.resolve(base, 'file.txt'));
  });

  it('should reject traversal above the base', () => {
    expect(() => validateLocalPath('../../etc/passwd', base)).toThrow('path escapes base dir');
  });

  it('should reject absolute paths outside the base', () => {
    expect(() => validateLocalPath('/etc/passwd', base)).toThrow('path escapes base dir');
  });

  it('should reject intermediate traversal that escapes', () => {
    expect(() => validateLocalPath('data/../../etc/hosts', base)).toThrow('path escapes base dir');
  });

  it('should accept normalized traversal that stays inside', () => {
    (fs.existsSync as vi.Mock).mockReturnValue(false);
    const result = validateLocalPath('data/../other/file.txt', base);
    expect(result).toBe(path.resolve(base, 'other/file.txt'));
  });

  it('should reject a bare parent traversal', () => {
    expect(() => validateLocalPath('..', base)).toThrow('path escapes base dir');
  });

  it('should reject symlinks that point outside the base', () => {
    (fs.existsSync as vi.Mock).mockReturnValue(true);
    (fs.realpathSync as vi.Mock).mockReturnValue('/etc/passwd');
    expect(() => validateLocalPath('data/link', base)).toThrow('symlink target escapes base dir');
  });

  it('should accept symlinks that resolve inside the base', () => {
    const target = path.resolve(base, 'other/real-file.txt');
    (fs.existsSync as vi.Mock).mockReturnValue(true);
    (fs.realpathSync as vi.Mock).mockReturnValue(target);
    const result = validateLocalPath('data/link', base);
    expect(result).toBe(path.resolve(base, 'data/link'));
  });
});

describe('setPathBaseDir / getPathBaseDir', () => {
  afterEach(() => {
    setPathBaseDir(undefined);
  });

  it('should return undefined by default', () => {
    expect(getPathBaseDir()).toBeUndefined();
  });

  it('should store and return the configured base dir', () => {
    setPathBaseDir('/some/dir');
    expect(getPathBaseDir()).toBe('/some/dir');
  });
});
