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

import { test, expect, describe } from 'vitest';
import { toCommandString } from './command_string.js';

const withPlatform = (platform: string, fn: () => void) => {
  const original = process.platform;
  Object.defineProperty(process, 'platform', { value: platform, configurable: true });
  try {
    fn();
  } finally {
    Object.defineProperty(process, 'platform', { value: original, configurable: true });
  }
};

test('joins args without whitespace unchanged', () => {
  expect(toCommandString(['compute', 'instances', 'list', '--zone=us-central1-a'])).toBe(
    'compute instances list --zone=us-central1-a',
  );
});

test('quotes an empty string arg so it is not dropped', () => {
  expect(toCommandString(['--filter', ''])).toBe('--filter ""');
});

describe('on POSIX (gcloud tokenizes with shlex.split(s))', () => {
  test('quotes a spaced flag=value arg', () => {
    withPlatform('linux', () => {
      expect(toCommandString(['spanner', 'databases', 'execute-sql', '--sql=SELECT 1'])).toBe(
        'spanner databases execute-sql "--sql=SELECT 1"',
      );
    });
  });

  test('quotes a bare value containing a space', () => {
    withPlatform('linux', () => {
      expect(toCommandString(['--filter', 'name:my instance'])).toBe('--filter "name:my instance"');
    });
  });

  test('quotes a compound logging filter passed as a single positional arg (#385)', () => {
    withPlatform('linux', () => {
      expect(
        toCommandString([
          'logging',
          'read',
          'resource.type=cloud_run_revision AND resource.labels.service_name=temporal-ui AND severity>=WARNING',
          '--project=my-project',
          '--limit=30',
        ]),
      ).toBe(
        'logging read "resource.type=cloud_run_revision AND resource.labels.service_name=temporal-ui AND severity>=WARNING" --project=my-project --limit=30',
      );
    });
  });

  test('single-quotes an arg containing a double quote', () => {
    withPlatform('linux', () => {
      expect(toCommandString(['--sql=SELECT "a" 1'])).toBe(`'--sql=SELECT "a" 1'`);
    });
  });

  test('falls back to escaped double-quoting when an arg contains both quote characters', () => {
    withPlatform('linux', () => {
      expect(toCommandString([`--sql=SELECT "a" 'b' 1`])).toBe(`"--sql=SELECT \\"a\\" 'b' 1"`);
    });
  });
});

describe('on Windows (gcloud tokenizes with shlex.split(s, posix=False))', () => {
  // shlex.split(s, posix=False) does not process backslash escapes and does
  // not strip quote characters from a token, and only starts a quoted region
  // when the quote is the very first character of that token. Naively
  // quoting a spaced flag=value arg (e.g. `"--sql=SELECT 1"`) would leave a
  // literal leading `"` on the token, so it stops matching the `--` prefix
  // gcloud's own tokenizer uses to classify it as a flag, and gets rejected
  // as an unrecognized positional argument instead. Since the lint result
  // never reports argument values back (`command_string_no_args` strips
  // them) and access-control matching only looks at the command path, it's
  // safe to mask internal whitespace in a flag's value instead of quoting
  // it.
  test('masks whitespace in a spaced flag=value arg instead of quoting it', () => {
    withPlatform('win32', () => {
      expect(toCommandString(['spanner', 'databases', 'execute-sql', '--sql=SELECT 1'])).toBe(
        'spanner databases execute-sql --sql=SELECT_1',
      );
    });
  });

  test('quotes a bare value containing a space', () => {
    withPlatform('win32', () => {
      expect(toCommandString(['--filter', 'name:my instance'])).toBe("--filter 'name:my instance'");
    });
  });

  test('masks whitespace in a bare value that also contains a double quote', () => {
    withPlatform('win32', () => {
      expect(
        toCommandString([
          '--filter',
          'resource.type="cloud_run_revision" AND resource.labels.service_name="api"',
        ]),
      ).toBe('--filter resource.type="cloud_run_revision"_AND_resource.labels.service_name="api"');
    });
  });

  test('masks whitespace in a spaced flag=value arg that also contains a double quote', () => {
    withPlatform('win32', () => {
      expect(toCommandString(['--sql=SELECT "a" 1'])).toBe('--sql=SELECT_"a"_1');
    });
  });
});
