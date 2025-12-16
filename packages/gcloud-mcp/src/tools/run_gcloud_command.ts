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
import { AccessControlList } from '../denylist.js';
import { findSuggestedAlternativeCommand } from '../suggest.js';
import { z } from 'zod';
import { log } from '../utility/logger.js';

const suggestionErrorMessage = (suggestedCommand: string) =>
  `Execution denied: This command not permitted. However, a similar command is permitted.
  To fix the issue, invoke this tool again with this alternative command:
  ${suggestedCommand}`;

const aclErrorMessage = (aclMessage: string) =>
  aclMessage +
  '\n\n' +
  'To get the access control list details, invoke this tool again with the args ["gcloud-mcp", "debug", "config"]';

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
- Always use '--format=json'. You may also choose to select columns using '--format=json(part.key, part.key2)'.
- Use --filter to match based on resource (or 'row'), prioritizing ':' for pattern matching and never quoting the right side of the colon in filters.
- You may access nested data directly with projections like '--format=json(part.key)' and use '.basename()' for URL fields.
- Retrieve only necessary information for the user intent. Utilize projection capability of '--format' reduce data size.
- If the exact JSON key path for formatting or filtering is unknown, run 'gcloud ... --limit=1 --format=json' to discover it.
- If you receive zero results while using a projection or filter: Consider whether the project/filter syntax may be incorrect.

## Adhere to the following restrictions:
- **No command substitution**: Do not use subshells or command substitution (e.g., $(...))
- **No pipes**: Do not use pipes (i.e., |) or any other shell-specific operators
- **No redirection**: Do not use redirection operators (e.g., >, >>, <)`,
      },
      async ({ args }) => {
        const toolLogger = log.mcp('run_gcloud_command', args);

        if (args.join(' ') === 'gcloud-mcp debug config') {
          return successfulTextResult(acl.print());
        }

        let parsedCommand;
        try {
          // Lint parses and isolates the gcloud command from flags and positionals.
          // Example
          //   Given: gcloud compute --log-http=true instance list
          //   Desired command string is: compute instances list
          const parsedLintResult = await gcloud.lint(args.join(' '));
          if (!parsedLintResult.success) {
            return errorTextResult(parsedLintResult.error);
          }
          parsedCommand = parsedLintResult.parsedCommand;
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : 'An unknown error occurred.';
          return errorTextResult(`Failed to parse the input command. ${msg}`);
        }

        try {
          const accessControlResult = acl.check(parsedCommand);
          if (!accessControlResult.permitted) {
            const suggestion = await findSuggestedAlternativeCommand(args, acl);
            if (suggestion) {
              return errorTextResult(suggestionErrorMessage(suggestion));
            } else {
              return errorTextResult(aclErrorMessage(accessControlResult.message));
            }
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
            result += `\nSTDERR:\n${stderr}`;
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
