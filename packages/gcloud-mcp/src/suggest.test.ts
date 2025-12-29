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

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseReleaseTrack, findSuggestedAlternativeCommand } from './suggest.js';
import * as gcloud from './gcloud.js';
import { createAccessControlList, AccessControlList } from './denylist.js';

vi.mock('./gcloud.js', () => {
  const lint = vi.fn();
  const create = vi.fn().mockResolvedValue({ lint });
  return { create, lint };
});

let mockedGcloudLint: ReturnType<typeof vi.fn>;

const mockGcloudLint = () => {
  mockedGcloudLint.mockImplementation(async (cmd: string) => ({
    success: true,
    parsedCommand: cmd,
  }));
};


let mockedGcloud: gcloud.GcloudExecutable;

describe('suggest', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockedGcloud = await gcloud.create();
    mockedGcloudLint = vi.mocked(mockedGcloud.lint);
    mockGcloudLint();
  });
  describe('parseReleaseTrack', () => {
    it('should return an empty string for GA commands', () => {
      expect(parseReleaseTrack('components install')).toEqual('');
    });

    it('should return the release track when present', () => {
      expect(parseReleaseTrack('beta components install')).toEqual('beta');
      expect(parseReleaseTrack('alpha components install')).toEqual('alpha');
    });
  });

  describe('findSuggestedAlternativeCommand', () => {
    it('should return null if the original command is invalid', async () => {
      mockedGcloudLint.mockImplementation(async () => ({
        success: false,
        error: 'invalid command',
      }));
      const acl: AccessControlList = createAccessControlList([], []);
      const suggestion = await findSuggestedAlternativeCommand(
        ['components', 'list'],
        acl,
        mockedGcloud
      );
      expect(suggestion).toBeNull();
    });

    it('should suggest a command in a different release track', async () => {
      const acl: AccessControlList = createAccessControlList([], []);
      const suggestion = await findSuggestedAlternativeCommand(
        ['beta', 'components', 'list'],
        acl,
        mockedGcloud
      );
      expect(suggestion).toEqual('gcloud components list');
    });

    it('should return null if no alternative is found', async () => {
      mockedGcloudLint.mockImplementation(async () => ({
        success: false,
        error: 'invalid command',
      }));
      mockedGcloudLint.mockImplementationOnce(async (cmd: string) => ({
        success: true,
        parsedCommand: cmd,
      }));
      const acl: AccessControlList = createAccessControlList([], []);
      const suggestion = await findSuggestedAlternativeCommand(
        ['components', 'list'],
        acl,
        mockedGcloud
      );
      expect(suggestion).toBeNull();
    });

    it('should respect the denylist', async () => {
      const acl: AccessControlList = createAccessControlList([], ['components list']);
      const suggestion = await findSuggestedAlternativeCommand(
        ['beta', 'components', 'list'],
        acl,
        mockedGcloud
      );
      expect(suggestion).toBeNull();
    });

    it('should suggest a beta command when the GA original is not allowed', async () => {
      mockedGcloudLint.mockImplementation(async (cmd: string) => ({
        success: true,
        parsedCommand: cmd,
      }));

      const acl: AccessControlList = createAccessControlList(['beta components'], []);
      const suggestion = await findSuggestedAlternativeCommand(
        ['components', 'list'],
        acl,
        mockedGcloud
      );
      expect(suggestion).toEqual('gcloud beta components list');
    });

    it('should suggest a GA command when the beta original has flags', async () => {
      mockedGcloudLint.mockImplementation(async (cmd: string) => ({
        success: true,
        parsedCommand: cmd,
      }));

      const acl: AccessControlList = createAccessControlList([], ['beta config list']);
      const suggestion = await findSuggestedAlternativeCommand(
        ['beta', '--log-http', 'config', '--verbosity', 'debug', 'list'],
        acl,
        mockedGcloud
      );
      expect(suggestion).toEqual('gcloud --log-http config --verbosity debug list');
    });
  });
});
