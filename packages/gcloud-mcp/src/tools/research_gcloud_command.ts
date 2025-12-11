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
import { z } from 'zod';
import { log } from '../utility/logger.js';

export const createResearchGcloudCommand = () => ({
  register: (server: McpServer) => {
    server.registerTool(
      'research_gcloud_command',
      {
        title: 'Research gcloud command',
        inputSchema: {
          command_parts: z
            .array(z.string())
            .describe(
              "The ordered list of command groups and the command itself. Example: for `gcloud compute instances list`, pass `['compute', 'instances', 'list']`. Do not include flags starting with `--`.",
            ),
        },
        description: `Retrieves the official help text and reference documentation for a Google Cloud CLI (gcloud) command.

**CRITICAL INSTRUCTION**: This is a MANDATORY PRECURSOR to the \`run_gcloud_command\` tool. You must use this tool to 'read the manual' before attempting to execute any command. 

**Workflow**:
1. **Research**: Call this tool with the target command path (e.g., \`['compute', 'instances', 'list']\`). Do NOT include flags (e.g., \`--project\`, \`--zone\`) in the input arguments.
2. **Verify**: The tool returns the official documentation. You must STOP and analyze this text. Check if your intended flags exist and if your argument syntax is correct.
3. **Execute**: Only after this verification step is complete, proceed to call \`run_gcloud_command\` with the validated arguments.

Use this tool to prevent syntax errors and hallucinated flags.`,
      },
      async ({ command_parts }) => {
        const args = command_parts as string[];
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
            toolLogger.error(
              `Failed to get help for command '${args.join(' ')}'.\nSTDERR:\n${helpStderr}`,
            );
            return errorTextResult(
              JSON.stringify(
                {
                  status: 'failure',
                  reason: 'invalid command or group',
                  instructions_for_agent: {
                    next_step: 'RESEARCH',
                    guidance: 'STOP making assumptions. Perform a search for the correct command.',
                  },
                  error_details: helpStderr,
                },
                null,
                2,
              ),
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

          const combinedDocumentation = `
${helpStdout}

## GLOBAL FLAGS (Partial)
${globalFlagsOutput}
`;

          const result = JSON.stringify(
            {
              status: 'success',
              documentation: combinedDocumentation,
              instructions_for_agent: {
                next_step: 'VERIFY',
                guidance:
                  "Compare your user's request against the above documentation. Identify any missing required flags. Ensure the command description aligns with the goal. Confirm the syntax for 'zone' and 'project'. Formulate the final command arguments to strictly adhere to this documentation.",
              },
            },
            null,
            2,
          );

          return successfulTextResult(result);
        } catch (e: unknown) {
          toolLogger.error(
            'research_gcloud_command failed',
            e instanceof Error ? e : new Error(String(e)),
          );
          const msg = e instanceof Error ? e.message : 'An unknown error occurred.';
          return errorTextResult(
            JSON.stringify(
              {
                status: 'failure',
                reason: 'execution error',
                error: msg,
              },
              null,
              2,
            ),
          );
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
