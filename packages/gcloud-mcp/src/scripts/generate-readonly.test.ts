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

import { describe, it, expect } from 'vitest';
import {
  removePrereleaseCommands,
  removeCommandGroups,
  removeDuplicates,
  getAllCommands,
  isReadonly,
  categorizeCommands,
} from './generate-readonly.js';

describe('getAllCommands', () => {
  it('should extract and process commands from HTML', async () => {
    const html = `
		<a href="/sdk/gcloud/reference/compute/instances/list"></a>
		<a href="/sdk/gcloud/reference/compute/instances/describe"></a>
		<a href="/sdk/gcloud/reference/compute/"></a>
	  `;
    const result = await getAllCommands(html);
    expect(result).toEqual(['compute instances describe', 'compute instances list']);
  });

  it('should handle duplicate links', async () => {
    const html = `
		<a href="/sdk/gcloud/reference/compute/instances/list"></a>
		<a href="/sdk/gcloud/reference/compute/instances/list"></a>
	  `;
    const result = await getAllCommands(html);
    expect(result).toEqual(['compute instances list']);
  });

  it('should handle empty html', async () => {
    const html = '';
    const result = await getAllCommands(html);
    expect(result).toEqual([]);
  });
});

describe('removePrereleaseCommands', () => {
  it('should remove commands that start with alpha, beta, or preview', () => {
    const commands = [
      'compute instances list',
      'alpha ml vision detect-labels',
      'beta privateca roots list',
      'preview app deploy',
      'functions deploy',
    ];

    const result = removePrereleaseCommands(commands);

    expect(result).toHaveLength(2);
    expect(result).toContain('compute instances list');
    expect(result).toContain('functions deploy');
    expect(result).not.toContain('alpha ml vision detect-labels');
    expect(result).not.toContain('beta privateca roots list');
    expect(result).not.toContain('preview app deploy');
  });

  it('should not modify the original array', () => {
    const commands = ['compute instances list', 'alpha ml vision detect-labels'];
    const result = removePrereleaseCommands(commands);
    expect(commands).toHaveLength(2);
    expect(result).toHaveLength(1);
  });
});

describe('removeCommandGroups', () => {
  it('should remove command groups from a list of commands', () => {
    const commands = [
      'auth',
      'auth application-default',
      'auth application-default login',
      'auth login',
      'compute',
      'compute instances',
      'compute instances list',
    ];
    const result = removeCommandGroups(commands);
    expect(result).toEqual([
      'auth application-default login',
      'auth login',
      'compute instances list',
    ]);
  });

  it('should not modify the original array', () => {
    const commands = ['compute', 'compute instances list'];
    const result = removeCommandGroups(commands);
    expect(commands).toHaveLength(2);
    expect(result).toHaveLength(1);
  });

  it('should handle an empty array', () => {
    const commands: string[] = [];
    const result = removeCommandGroups(commands);
    expect(result).toEqual([]);
  });

  it('should handle an array with no command groups', () => {
    const commands = ['auth login', 'compute instances list'];
    const result = removeCommandGroups(commands);
    expect(result).toEqual(['auth login', 'compute instances list']);
  });
});

describe('removeDuplicates', () => {
  it('should remove duplicate strings from an array', () => {
    const elements = ['a', 'b', 'a', 'c', 'b'];
    const result = removeDuplicates(elements);
    expect(result).toEqual(['a', 'b', 'c']);
  });

  it('should not modify the original array', () => {
    const elements = ['a', 'b', 'a'];
    const result = removeDuplicates(elements);
    expect(elements).toHaveLength(3);
    expect(result).toHaveLength(2);
  });

  it('should handle an empty array', () => {
    const elements: string[] = [];
    const result = removeDuplicates(elements);
    expect(result).toEqual([]);
  });

  it('should handle an array with no duplicates', () => {
    const elements = ['a', 'b', 'c'];
    const result = removeDuplicates(elements);
    expect(result).toEqual(['a', 'b', 'c']);
  });
});

describe('isReadonly', () => {
  it('should return true for readonly commands', () => {
    expect(isReadonly('compute instances list')).toBe(true);
    expect(isReadonly('projects get-iam-policy')).toBe(true);
    expect(isReadonly('auth print-access-token')).toBe(true);
  });

  it('should return false for non-readonly commands', () => {
    expect(isReadonly('compute instances create')).toBe(false);
    expect(isReadonly('projects delete')).toBe(false);
    expect(isReadonly('auth login')).toBe(false);
  });

  it('should handle commands with hyphens', () => {
    expect(isReadonly('iam service-accounts keys list')).toBe(true);
    expect(isReadonly('iam service-accounts keys upload')).toBe(false);
  });

  it('should handle test-iam-permissions', () => {
    expect(isReadonly('projects test-iam-permissions')).toBe(true);
  });

  it('should handle an empty string', () => {
    expect(isReadonly('')).toBe(false);
  });
});

describe('categorizeCommands', () => {
  it('should categorize commands into readonly and unclassified', () => {
    const commands = [
      'compute instances list',
      'compute instances create',
      'projects get-iam-policy',
      'projects delete',
    ];
    const { readonly, unclassified } = categorizeCommands(commands);
    expect(readonly).toEqual(['compute instances list', 'projects get-iam-policy']);
    expect(unclassified).toEqual(['compute instances create', 'projects delete']);
  });

  it('should handle an empty array', () => {
    const { readonly, unclassified } = categorizeCommands([]);
    expect(readonly).toEqual([]);
    expect(unclassified).toEqual([]);
  });
});
