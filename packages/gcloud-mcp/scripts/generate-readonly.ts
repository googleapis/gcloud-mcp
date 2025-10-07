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

/* eslint-disable no-console */ // Scripts may use console.

import * as fs from 'fs';

// getAllCommands fetches the gcloud reference documentation, processes it,
// and returns a list of unique gcloud commands.
async function getAllCommands(): Promise<string[]> {
  const body = await fetchHTML('https://cloud.google.com/sdk/gcloud/reference');
  const referenceDocPaths = /"\/sdk\/gcloud\/reference\/[^"]*"/g;

  const uniqueMatches = removeDuplicates(body.match(referenceDocPaths) || []);
  const processedMatches = uniqueMatches.map((match) => {
    let trimmedMatch = match.replace(`"/sdk/gcloud/reference/`, '');
    trimmedMatch = trimmedMatch.slice(0, -1);
    return trimmedMatch.replace(/\//g, ' ');
  });

  return removeCommandGroups(processedMatches);
}

// fetchHTML fetches the content of a URL and returns it as a string.
async function fetchHTML(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`failed to fetch HTML: ${response.statusText}`);
  }
  return await response.text();
}

// removeDuplicates removes duplicate strings from a slice.
function removeDuplicates(elements: string[]): string[] {
  return [...new Set(elements)];
}

// removeCommandGroups filters out command groups from a list of commands.
// A command is considered a group if it is a prefix of another command in the list.
function removeCommandGroups(unsortedCommands: string[]): string[] {
  const commands = [...unsortedCommands];
  commands.sort();

  const result: string[] = [];
  for (let i = 0; i < commands.length; i++) {
    const cmd = commands[i] ?? '';
    const next = commands[i + 1] ?? '';
    if (next.startsWith(cmd + ' ')) {
      // This entry is a command group, if the next entry is a command
      // prefixed with this one. Requires a sorted command list.
      continue;
    }
    result.push(cmd);
  }
  return result;
}

// removePrereleaseCommands filters out commands that start with "alpha", "beta", or "preview".
function removePrereleaseCommands(commands: string[]): string[] {
  return commands.filter(
    (cmd) => !cmd.startsWith('alpha') && !cmd.startsWith('beta') && !cmd.startsWith('preview'),
  );
}

function classifyCommand(command: string): 'readonly' | 'unknown' {
  const readonlyPrefixes: string[] = [
    'cat',
    'describe',
    'diff',
    'export',
    'fetch',
    'find',
    'get',
    'info',
    'list',
    'lookup',
    'ls',
    'query',
    'read',
    'search',
    'show',
    'status',
    'test-iam-permissions',
    'version',
  ];

  const parts = command.split(/\s+/);
  const lastPart = parts[parts.length - 1] ?? '';

  for (const keyword of readonlyPrefixes) {
    if (lastPart === keyword || lastPart.startsWith(keyword + '-')) {
      return 'readonly';
    }
  }

  return 'unknown';
}

async function main() {
  try {
    const commands = await getAllCommands();
    const filteredCommands = removePrereleaseCommands(commands);

    const readonly: string[] = [];
    const unknown: string[] = [];

    for (const cmd of filteredCommands) {
      if (classifyCommand(cmd) === 'readonly') {
        readonly.push(cmd);
      } else {
        unknown.push(cmd);
      }
    }

    fs.mkdirSync('src/generated/', { recursive: true });
    fs.writeFileSync('src/generated/readonly.json', JSON.stringify({ allow: readonly }, null, 2));
    fs.writeFileSync('src/generated/unknown.json', JSON.stringify({ allow: unknown }, null, 2));
  } catch (err) {
    console.error('Error getting commands:', err);
    process.exit(1);
  }
}

main();
