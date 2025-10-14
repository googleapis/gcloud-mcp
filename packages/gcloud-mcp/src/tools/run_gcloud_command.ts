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
import { allowCommands, denyCommands } from '../denylist.js';
import { z } from 'zod';
import { log } from '../utility/logger.js';
import { McpConfig } from '../index.js';

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
    }

    const { code } = await gcloud.lint(alternativeCommandWithAllArgs.join(' '));
    if (code === 0) {
      const reason = listType === 'deny' ? 'is on the denylist' : 'is not on the allowlist';
      return `Execution denied: The command 'gcloud ${commandArgsNoGcloud}' ${reason}.
However, a similar command is available: 'gcloud ${alternativeCommandWithAllArgs.join(' ')}'.
Invoke this tool again with this alternative command to fix the issue.`;
    }
  }
  return null;
}

export const createRunGcloudCommand = (config: McpConfig = {}, default_denylist: string[]) => ({
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
        const userDeny = config.deny ?? [];
        const userAllow = config.allow ?? [];
        const fullDenylist = [...new Set([...default_denylist, ...userDeny])];

        if (command === 'gcloud-mcp debug config') {
          let message = '# The user has the following commands denylisted:\n';
          if (userAllow.length > 0) {
            message = '# The user has the following commands allowlisted:\n';
            message += userAllow.map((c) => `- ${c}`).join('\n');
          } else {
            message += userDeny.map((c) => `- ${c}`).join('\n');
          }
          return { content: [{ type: 'text', text: message }] };
        }

        try {
          // Lint parses and isolates the gcloud command from flags and positionals.
          // Example
          //   Given: gcloud compute --log-http=true instance list
          //   Desired command string is: compute instances list
          let { code, stdout, stderr } = await gcloud.lint(command);
          const parsedJson = JSON.parse(stdout);
          const commandNoArgs = parsedJson[0]['command_string_no_args'];
          const commandArgsNoGcloud = commandNoArgs.split(' ').slice(1).join(' '); // Remove gcloud prefix
          const commandNoArgsParts = commandArgsNoGcloud.split(' ');
          const argsCopy = [...args];
          for (const part of commandNoArgsParts) {
            const index = argsCopy.indexOf(part);
            if (index > -1) {
              argsCopy.splice(index, 1);
            }
          }

          const userConfigMessage = (listType: 'allow' | 'deny') => `
To get the user-specified ${listType}list, invoke this tool again with the args ["gcloud-mcp", "debug", "config"]`;

          if (userAllow.length > 0 && !allowCommands(userAllow).matches(commandArgsNoGcloud)) {
            const suggestion = await findAlternativeCommand(
              args,
              commandArgsNoGcloud,
              userAllow,
              'allow',
            );
            if (suggestion) {
              return {
                content: [{ type: 'text', text: suggestion }],
                isError: true,
              };
            }

            let allowlistMessage = `Execution denied: This command is not on the allowlist. Do not attempt to run this command again - it will always fail. Instead, proceed a different way or ask the user for clarification.`;

            if (userAllow.length > 0) {
              allowlistMessage += userConfigMessage('allow');
            }

            allowlistMessage += `

## Allowlist Behavior:
- An allowlist can be provided in the configuration file.
- A configuration file cannot contain both an allowlist and a custom denylist.`;
            return {
              content: [
                {
                  type: 'text',
                  text: allowlistMessage,
                },
              ],
              isError: true,
            };
          }

          if (denyCommands(fullDenylist).matches(commandArgsNoGcloud)) {
            const suggestion = await findAlternativeCommand(
              args,
              commandArgsNoGcloud,
              fullDenylist,
              'deny',
            );
            if (suggestion) {
              return {
                content: [{ type: 'text', text: suggestion }],
                isError: true,
              };
            }

            let denylistMessage = `Execution denied: This command is on the denylist. Do not attempt to run this command again - it will always fail. Instead, proceed a different way or ask the user for clarification.`;
            if (userDeny.length > 0) {
              denylistMessage += userConfigMessage('deny');
            }

            denylistMessage += `

## Denylist Behavior:
- The default denylist is ALWAYS active, blocking potentially interactive or sensitive commands.
- A custom denylist can be provided via a configuration file, which is then merged with the default list.
- Command matching is based on prefix. The input command is normalized to ensure only full command groups are matched (e.g., \`app\` matches \`app deploy\` but not \`apphub\`).
- If a GA (General Availability) command is on the denylist, all of its release tracks (e.g., alpha, beta) are denied as well.

### Default Denied Commands:
The following commands are always denied:
${default_denylist.map((command) => `-  '${command}'`).join('\n')}`;
            return {
              content: [
                {
                  type: 'text',
                  text: denylistMessage,
                },
              ],
              isError: true,
            };
          }

          toolLogger.info('Executing run_gcloud_command');
          ({ code, stdout, stderr } = await gcloud.invoke(args));
          // If the exit status is not zero, an error occurred and the output may be
          // incomplete unless the command documentation notes otherwise. For example,
          // a command that creates multiple resources may only create a few, list them
          // on the standard output, and then exit with a non-zero status.
          // See https://cloud.google.com/sdk/docs/scripting-gcloud#best_practices
          let result = stdout;
          if (code !== 0 || stderr) {
            result += `\nstderr:\n${stderr}`;
          }
          return { content: [{ type: 'text', text: result }] };
        } catch (e: unknown) {
          toolLogger.error(
            'run_gcloud_command failed',
            e instanceof Error ? e : new Error(String(e)),
          );
          const msg = e instanceof Error ? e.message : 'An unknown error occurred.';
          return { content: [{ type: 'text', text: msg }], isError: true };
        }
      },
    );
  },
});
