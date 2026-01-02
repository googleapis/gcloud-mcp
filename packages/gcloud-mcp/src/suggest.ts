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

import { AccessControlList, PRERELEASE_TRACKS_PRIORITIZED } from './denylist.js';
import * as gcloud from './gcloud.js';

export const parseReleaseTrack = (cmd: string): string => {
  for (const releaseTrack of PRERELEASE_TRACKS_PRIORITIZED) {
    if (cmd.startsWith(releaseTrack + ' ')) {
      return releaseTrack;
    }
  }
  return ''; // GA
};

export async function findSuggestedAlternativeCommand(
  originalArgs: string[],
  acl: AccessControlList,
  gcloud: gcloud.GcloudExecutable,
): Promise<string | null> {
  const lintResult = await gcloud.lint(originalArgs.join(' '));
  if (!lintResult.success) {
    return null;
  }
  const originalTrack = parseReleaseTrack(lintResult.parsedCommand);
  const trackIndex = originalTrack ? originalArgs.indexOf(originalTrack) : -1;
  const strippedArgs = [...originalArgs];
  if (trackIndex > -1) {
    strippedArgs.splice(trackIndex, 1);
  }

  for (const releaseTrack of ['', ...PRERELEASE_TRACKS_PRIORITIZED]) {
    if (releaseTrack === originalTrack) {
      continue;
    }

    // Prepend release track to arguments
    const altArgs = [...strippedArgs];
    if (releaseTrack) {
      altArgs.unshift(releaseTrack);
    }

    const lintResult = await gcloud.lint(altArgs.join(' '));
    if (!lintResult.success) {
      continue; // Argument set not valid for this release track.
    }
    const aclResult = acl.check(lintResult.parsedCommand);
    if (!aclResult.permitted) {
      continue; // ACL does not permit this release track + command.
    }

    return `gcloud ${altArgs.join(' ')}`; // Suggestion found.
  }
  return null;
}
