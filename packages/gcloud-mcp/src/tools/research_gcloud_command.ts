/**
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * 	http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as gcloud from '../gcloud.js';
import { z } from 'zod';
import { log } from '../utility/logger.js';

export const createResearchGcloudCommand = () => ({
  register: (server: McpServer) => {
    server.registerTool(
      'research_gcloud_command',
      {
        title: 'Research gcloud command',
        inputSchema: {
          args: z.array(z.string()),
        },
        description: `Returns the help documentation for a gcloud command.
Use this tool when you need to understand the usage, flags, and arguments of a specific gcloud command.
This tool mimics the output of 'gcloud help [args]' with markdown formatting.`,
      },
      async ({ args }) => {
        const toolLogger = log.mcp('research_gcloud_command', args);

        try {
          toolLogger.info('Executing research_gcloud_command');

          // Part 1: gcloud [args] --document=style=markdown
          const helpCmdArgs = [...args, '--document=style=markdown'];
          const { 
            code: helpCode,
            stdout: helpStdout,
            stderr: helpStderr,
          } = await gcloud.invoke(helpCmdArgs);

          if (helpCode !== 0) {
            return errorTextResult(
              `Failed to get help for command '${args.join(' ')}'.\nSTDERR:\n${helpStderr}`,
            );
          }

          // Part 2: gcloud help --format="markdown(global_flags)"
          // and filter: grep -A10 "GLOBAL FLAGS" | tail -n +2 | head -n 10
          const globalFlagsArgs = ['help', '--format=markdown(global_flags)'];
          const {
            code: globalCode,
            stdout: globalStdout,
            stderr: globalStderr,
          } = await gcloud.invoke(globalFlagsArgs);

          let globalFlagsOutput = '';
          if (globalCode === 0) {
            const lines = globalStdout.split('\n');
            const globalFlagsIndex = lines.findIndex((line) => line.includes('GLOBAL FLAGS'));

            if (globalFlagsIndex !== -1) {
              // grep -A10 "GLOBAL FLAGS" includes the match and 10 lines after.
              // tail -n +2 skips the first line (the match).
              // head -n 10 takes the next 10 lines.
              // So we want lines from globalFlagsIndex + 1 to globalFlagsIndex + 1 + 10 (exclusive)
              globalFlagsOutput = lines
                .slice(globalFlagsIndex + 1, globalFlagsIndex + 11)
                .join('\n');
            }
          } else {
             toolLogger.warn(`Failed to get global flags help.\nSTDERR:\n${globalStderr}`);
          }

          const result = `

Please provide relevant context for the gcloud command and flags: 
${args.join(' ')}.

Output of gcloud ${args.join(' ')} --document=style=markdown:
${helpStdout}

Output of gcloud help --format="markdown(global_flags)" | grep -A10 "GLOBAL FLAGS" | tail -n +2 | head -n 10:
${globalFlagsOutput}
`;

          return successfulTextResult(result);
        } catch (e: unknown) {
          toolLogger.error(
            'research_gcloud_command failed',
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