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

import { describe, expect, test } from 'vitest';
import { shellJoinArgs } from './shell_join.js';

describe('shellJoinArgs', () => {
  test('joins args without spaces as-is', () => {
    expect(shellJoinArgs(['logging', 'read', '--limit=10'])).toBe('logging read --limit=10');
  });

  test('quotes args that contain spaces', () => {
    expect(
      shellJoinArgs([
        'logging',
        'read',
        'resource.type=cloud_run_revision AND severity>=WARNING',
        '--limit=10',
      ]),
    ).toBe("logging read 'resource.type=cloud_run_revision AND severity>=WARNING' --limit=10");
  });

  test('handles multiple args with spaces', () => {
    expect(shellJoinArgs(['compute', 'instances', 'list', '--filter=name:my instance'])).toBe(
      "compute instances list '--filter=name:my instance'",
    );
  });

  test('returns empty string for empty array', () => {
    expect(shellJoinArgs([])).toBe('');
  });

  test('handles single arg without spaces', () => {
    expect(shellJoinArgs(['list'])).toBe('list');
  });

  test('handles single arg with spaces', () => {
    expect(shellJoinArgs(['hello world'])).toBe("'hello world'");
  });
});
