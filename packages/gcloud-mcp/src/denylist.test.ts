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

import { describe, expect, it } from 'vitest';
import { allowCommands, denyCommands } from './denylist.js';

describe('allowCommands', () => {
  it('returns true if the allowlist is empty', () => {
    const allowlist = allowCommands([]);
    expect(allowlist.matches('compute instances list')).toBe(true);
  });

  it('returns true for a command that is on the allowlist', () => {
    const allowlist = allowCommands(['compute instances']);
    expect(allowlist.matches('compute instances list')).toBe(true);
  });

  it('returns false for a command that is not on the allowlist', () => {
    const allowlist = allowCommands(['compute']);
    expect(allowlist.matches('storage buckets list')).toBe(false);
  });

  it('handles multiple items in the allowlist', () => {
    const allowlist = allowCommands(['compute', 'storage buckets']);
    expect(allowlist.matches('compute instances list')).toBe(true);
    expect(allowlist.matches('storage buckets list')).toBe(true);
    expect(allowlist.matches('storage blobs list')).toBe(false);
    expect(allowlist.matches('source repos list')).toBe(false);
  });

  it('differentiates a command that is a substring of another command', () => {
    const allowlist = allowCommands(['app']);
    expect(allowlist.matches('app')).toBe(true);
    expect(allowlist.matches('app deploy')).toBe(true);
    expect(allowlist.matches('alpha app deploy')).toBe(false);
    expect(allowlist.matches('apphub')).toBe(false);
    expect(allowlist.matches('beta apphub')).toBe(false);
  });

  it('is case and padding insensitive', () => {
    const allowlist = allowCommands(['STORAGE  \r\n\t   ']);
    expect(allowlist.matches('storage')).toBe(true);
    expect(allowlist.matches('Storage')).toBe(true);
    expect(allowlist.matches('  storAGE ')).toBe(true);
    expect(allowlist.matches('compute')).toBe(false);
  });
});

describe('denyCommands', () => {
  it('returns false if the denylist is empty', () => {
    const denylist = denyCommands([]);
    expect(denylist.matches('compute instances list')).toBe(false);
  });

  it('returns true for a command that is on the denylist', () => {
    const denylist = denyCommands(['compute instances']);
    expect(denylist.matches('compute instances list')).toBe(true);
  });

  it('returns false for a command that is not on the denylist', () => {
    const denylist = denyCommands(['compute instances']);
    expect(denylist.matches('storage buckets list')).toBe(false);
  });

  it('handles multiple items in the denylist', () => {
    const denylist = denyCommands(['compute instances', 'storage buckets list']);
    expect(denylist.matches('compute instances list')).toBe(true);
    expect(denylist.matches('storage buckets list')).toBe(true);
    expect(denylist.matches('storage buckets update')).toBe(false);
    expect(denylist.matches('source repos list')).toBe(false);
  });

  it('handles release tracks', () => {
    const denylist = denyCommands(['compute instances']);
    expect(denylist.matches('alpha compute instances list')).toBe(true);
    expect(denylist.matches('beta compute instances list')).toBe(true);
    expect(denylist.matches('preview compute instances list')).toBe(true);
  });

  it('does not denylist partial matches', () => {
    const denylist = denyCommands(['compute instances']);
    expect(denylist.matches('compute')).toBe(false);
    expect(denylist.matches('compute networks')).toBe(false);
  });

  it('supports denylisting whole release tracks', () => {
    const denylist = denyCommands(['alpha']);
    expect(denylist.matches('compute')).toBe(false);
    expect(denylist.matches('alpha compute')).toBe(true);
    expect(denylist.matches('alpha storage')).toBe(true);
  });

  it('differentiates a command that is a substring of another command', () => {
    const denylist = denyCommands(['app']);
    expect(denylist.matches('app')).toBe(true);
    expect(denylist.matches('app deploy')).toBe(true);
    expect(denylist.matches('alpha app deploy')).toBe(true);
    expect(denylist.matches('apphub')).toBe(false);
    expect(denylist.matches('beta apphub')).toBe(false);
  });

  it('is case and padding insensitive', () => {
    const denylist = denyCommands(['\t\n\r   STORAGE   ']);
    expect(denylist.matches('storage')).toBe(true);
    expect(denylist.matches('Storage')).toBe(true);
    expect(denylist.matches('  storAGE ')).toBe(true);
    expect(denylist.matches('compute')).toBe(false);
  });
});
