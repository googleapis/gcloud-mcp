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

import { test, expect } from 'vitest';
import { toCommandString } from './command_string.js';

test('joins args without whitespace unchanged', () => {
  expect(toCommandString(['compute', 'instances', 'list', '--zone=us-central1-a'])).toBe(
    'compute instances list --zone=us-central1-a',
  );
});

test('quotes an arg containing a space', () => {
  expect(toCommandString(['spanner', 'databases', 'execute-sql', '--sql=SELECT 1'])).toBe(
    'spanner databases execute-sql "--sql=SELECT 1"',
  );
});

test('quotes a bare value containing a space', () => {
  expect(toCommandString(['--filter', 'name:my instance'])).toBe('--filter "name:my instance"');
});

test('escapes double quotes already present in an arg that needs quoting', () => {
  expect(toCommandString(['--sql=SELECT "a" 1'])).toBe('"--sql=SELECT \\"a\\" 1"');
});

test('quotes an empty string arg so it is not dropped', () => {
  expect(toCommandString(['--filter', ''])).toBe('--filter ""');
});
