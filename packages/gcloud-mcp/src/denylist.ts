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

export const PRERELEASE_TRACKS_PRIORITIZED = ['beta', 'alpha', 'preview'];

export type AccessControlResult =
  | {
      permitted: true;
    }
  | {
      permitted: false;
      message: string;
    };

const notAllowedMessage = `Execution denied: This command is not on the access control's allowlist.
* Do not attempt to run this command again - it will always fail. 
* Instead, proceed a different way or ask the user for clarification.`;

const deniedMessage = `Execution denied: This command is on the access control's denylist.
* Do not attempt to run this command again - it will always fail.
* Instead, proceed a different way or ask the user for clarification.

## Denylist Behavior:
* The denylist is ALWAYS active, blocking potentially interactive or sensitive commands.
* Command matching is based on prefix.
* Commands are normalized to ensure only full command groups are matched (e.g., \`app\` matches \`app deploy\` but not \`apphub\`).
* When a GA (General Availability) command is on the denylist, all its release tracks (e.g., alpha, beta) are also denied.`;

export type AccessControlList = ReturnType<typeof createAccessControlList>;

export const createAccessControlList = (allow: string[] = [], deny: string[] = []) => {
  const allowlist = allowCommands(preprocess(allow));
  const denylist = denyCommands(preprocess(deny));
  return {
    check: (candidate: string): AccessControlResult => {
      if (denylist.matches(candidate)) {
        return { permitted: false, message: deniedMessage };
      }
      if (!allowlist.matches(candidate)) {
        return { permitted: false, message: notAllowedMessage };
      }
      return { permitted: true };
    },
    print: () => {
      const hasDenylist = denylist.get().length > 0;
      const hasAllowlist = allowlist.get().length > 0;

      let output = `# Access control list

* Command matching is based on prefix.
* Commands are normalized to ensure only full command groups are matched (e.g., \`app\` matches \`app deploy\` but not \`apphub\`).
* When a GA (General Availability) command is on the denylist, all its release tracks (e.g., alpha, beta) are also denied.
`;
      if (hasDenylist && hasAllowlist) {
        output += '* The denylist takes precedence over the allowlist.\n';
      }
      if (hasDenylist) {
        output += '\n## Denylisted commands\n\n';
        output += denylist
          .get()
          .map((c) => `- ${c}`)
          .join('\n');
      }
      if (hasAllowlist) {
        output = '\n## Allowlisted commands:\n\n';
        output += allowlist
          .get()
          .map((c) => `- ${c}`)
          .join('\n');
      }
      return output;
    },
  };
};

// Normalize, remove duplicates, and sort.
const preprocess = (list: string[] = []) =>
  [...new Set(list.map((c) => normalizeForComparison(c)))].sort();

// Normalize the string in case the list and LLM formatting differs.
// Append a space to avoid matching with commands that are substrings.
// For example: app and apphub
const normalizeForComparison = (s: string): string => s.toLowerCase().trim() + ' ';

export const allowCommands = (allow: string[] = []) => ({
  get: () => allow,
  matches: (command: string): boolean => {
    if (allow.length === 0) {
      return true; // No allow = all commands allowed
    }

    const cmd = normalizeForComparison(command);
    for (const allowedCommand of allow) {
      if (cmd.startsWith(normalizeForComparison(allowedCommand))) {
        return true;
      }
    }
    return false;
  },
});

export const denyCommands = (deny: string[] = []) => ({
  get: () => deny,
  matches: (command: string): boolean => {
    if (deny.length === 0) {
      return false; // No deny = all commands allowed
    }

    // Deny'ing a GA command denies all release tracks.
    // Deny'ing a pre-GA command only denies the specified release track.
    const cmd = normalizeForComparison(command);
    for (const deniedCommand of deny) {
      for (const release of ['', ...PRERELEASE_TRACKS_PRIORITIZED]) {
        // Adds GA release track.
        if (cmd.startsWith(normalizeForComparison(`${release} ${deniedCommand}`))) {
          return true;
        }
      }
    }
    return false;
  },
});
