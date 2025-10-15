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

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as gcloud from '../gcloud.js';
import { AccessControlList, AccessControlResult, allowCommands, denyCommands } from '../denylist.js';
import { z } from 'zod';
import { log } from '../utility/logger.js';
import { access } from 'fs';

async function findAlternativeCommand(
  args: string[],
  commandArgsNoGcloud: string,
  list: string[],
  listType: 'allow' | 'deny',
): Promise<string | null> {
  const commandParts = commandArgsNoGcloud.split(' ');
  const releaseTracks = ['alpha', 'beta'];
  let track = '';
  let commandWithoutTrack = commandArgsNoGcloud;
  let trackIndex = -1;

  const firstPart = commandParts[0];
  if (firstPart && releaseTracks.includes(firstPart)) {
    track = firstPart;
    commandWithoutTrack = commandParts.slice(1).join(' ');
    trackIndex = args.indexOf(track);
  }

  const tracksToTry: string[] = [];
  if (track === 'alpha') {
    tracksToTry.push('', 'beta');
  } else if (track === 'beta') {
    tracksToTry.push('', 'alpha');
  } else {
    tracksToTry.push('beta', 'alpha');
  }

  for (const t of tracksToTry) {
    const alternativeCommand = t ? `${t} ${commandWithoutTrack}` : commandWithoutTrack;

    if (listType === 'deny' && denyCommands(list).matches(alternativeCommand)) {
      continue;
    }

    if (listType === 'allow' && !allowCommands(list).matches(alternativeCommand)) {
      continue;
    }

    const alternativeCommandWithAllArgs = [...args];
    if (trackIndex !== -1) {
      if (t) {
        alternativeCommandWithAllArgs[trackIndex] = t;
      } else {
        alternativeCommandWithAllArgs.splice(trackIndex, 1);
      }
    } else {
      alternativeCommandWithAllArgs.unshift(t);
    }

    const { success } = await gcloud.lint(alternativeCommandWithAllArgs.join(' '));
    if (success) {
      const reason = listType === 'deny' ? 'is on the denylist' : 'is not on the allowlist';
      return `Execution denied: The command 'gcloud ${commandArgsNoGcloud}' ${reason}.
However, a similar command is available: 'gcloud ${alternativeCommandWithAllArgs.join(' ')}'.
Invoke this tool again with this alternative command to fix the issue.`;
    } else {
      // The given flags are invalid for this release track, so we ignore this as an option.
    }
  }
  return null;
}

const accessControlErrorResult = (parsedCommand: string, acl: AccessControlList, aclMessage: string) => {
  const suggestion = findSuggestedAlternative(parsedCommand, acl);
  if (suggestion.isAvailable) {
    return errorTextResult(suggestion.message);
  }
  const msg = `${aclMessage}

To get the access control list details, invoke this tool again with the args ["gcloud-mcp", "debug", "config"]`;
  return errorTextResult(msg);
}

export const createRunGcloudCommand = (acl: AccessControlList) => ({
  register: (server: McpServer) => {
    server.registerTool(
      'run_gcloud_command',
      {
        title: 'Run gcloud command',
        inputSchema: {
          args: z.array(z.string()),
        },
        description: `Executes a gcloud command.

## Instructions:
- Use this tool to execute a single gcloud command at a time.
- Use this tool when you are confident about the exact gcloud command needed to fulfill the user's request.
- Prioritize this tool over any other to directly execute gcloud commands.
- Assume all necessary APIs are already enabled. Do not proactively try to enable any APIs.
- Do not use this tool to execute command chaining or command sequencing -- it will fail.
- Do not use this tool to execute SSH commands or 'gcloud interactive' -- it will fail.
- Always include all required parameters.
- Ensure parameter values match the expected format.

## Adhere to the following restrictions:
- **No command substitution**: Do not use subshells or command substitution (e.g., $(...))
- **No pipes**: Do not use pipes (i.e., |) or any other shell-specific operators
- **No redirection**: Do not use redirection operators (e.g., >, >>, <)`,
      },
      async ({ args }) => {
        const toolLogger = log.mcp('run_gcloud_command', args);
        const command = args.join(' ');

        if (command === 'gcloud-mcp debug config') {
          return successfulTextResult(acl.print());
        }

        let parsedCommand;
        try {
          // Lint parses and isolates the gcloud command from flags and positionals.
          // Example
          //   Given: gcloud compute --log-http=true instance list
          //   Desired command string is: compute instances list
          const parsedLintResult = await gcloud.lint(command);
          if (!parsedLintResult.success) {
            return errorTextResult(parsedLintResult.error);
          }
          parsedCommand = parsedLintResult.parsedCommand;
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : 'An unknown error occurred.';
          return errorTextResult(`Failed to parse the input command. ${msg}`);
        }

        try {
          const accessControlResult = acl.isPermitted(parsedCommand);
          if (!accessControlResult.permitted) {
            return accessControlErrorResult(parsedCommand, acl, accessControlResult.message);
          }

          toolLogger.info('Executing run_gcloud_command');
          const { code, stdout, stderr } = await gcloud.invoke(args);
          // If the exit status is not zero, an error occurred and the output may be
          // incomplete unless the command documentation notes otherwise. For example,
          // a command that creates multiple resources may only create a few, list them
          // on the standard output, and then exit with a non-zero status.
          // See https://cloud.google.com/sdk/docs/scripting-gcloud#best_practices
          let result = stdout;
          if (code !== 0 || stderr) {
            result += `\nstderr:\n${stderr}`;
          }
          return successfulTextResult(result);
        } catch (e: unknown) {
          toolLogger.error(
            'run_gcloud_command failed',
            e instanceof Error ? e : new Error(String(e)),
          );
          const msg = e instanceof Error ? e.message : 'An unknown error occurred.';
          return errorTextResult(msg);
        }
      },
    );
  },
});

type TextResultType = { content: [{ type: 'text'; text: string }]; isError?: boolean };

const successfulTextResult = (text: string): TextResultType => ({
  content: [{ type: 'text', text }],
});

const errorTextResult = (text: string): TextResultType => ({
  content: [{ type: 'text', text }],
  isError: true,
});
