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
import { deniedCommands } from '../denylist.js';
import { z } from 'zod';
import { log } from '../utility/logger.js';

export const createRunGcloudCommand = (denylist: string[] = []) => ({
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
        try {
          // Lint parses and isolates the gcloud command from flags and positionals.
          // Example
          //   Given: gcloud compute --log-http=true instance list
          //   Desired command string is: compute instances list
          let { code, stdout, stderr } = await gcloud.lint(command);
          const parsedJson = JSON.parse(stdout);
          const commandNoArgs = parsedJson[0]['command_string_no_args'];
          const commandArgsNoGcloud = commandNoArgs.split(' ').slice(1).join(' '); // Remove gcloud prefix

          if (deniedCommands(denylist).matches(commandArgsNoGcloud)) {
            return {
              content: [
                {
                  type: 'text',
                  text: `Command is part of this tool's current denylist of disabled commands.`,
                },
              ],
            };
          }

          toolLogger.info('Executing run_gcloud_command');
          ({ code, stdout, stderr } = await gcloud.invoke(args));
          // If the exit status is not zero, an error occurred and the output may be
          // incomplete unless the command documentation notes otherwise. For example,
          // a command that creates multiple resources may only create a few, list them
          // on the standard output, and then exit with a non-zero status.
          // See https://cloud.google.com/sdk/docs/scripting-gcloud#best_practices
          let result = `gcloud process exited with code ${code}. stdout:\n${stdout}`;
          if (stderr) {
            result += `\nstderr:\n${stderr}`;
          }
          return { content: [{ type: 'text', text: result }] };
        } catch (e: unknown) {
          toolLogger.error('run_gcloud_command failed', e instanceof Error ? e : new Error(String(e)));
          const msg = e instanceof Error ? e.message : 'An unknown error occurred.';
          return { content: [{ type: 'text', text: msg }], isError: true };
        }
      },
    );
  },
});
