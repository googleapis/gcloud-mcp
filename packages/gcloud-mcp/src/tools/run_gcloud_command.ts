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
import { invoke } from '../gcloud.js';
import { z } from 'zod';

export const registerRunGcloudCommand = (server: McpServer) => {
  server.registerTool(
    'run_gcloud_command',
    {
      title: 'Run gcloud command',
      description: 'Invokes a given gcloud command using the local gcloud installation.',
      inputSchema: {
        args: z.array(z.string()),
      },
    },
    async ({ args }) => {
      try {
        const { code, stdout, stderr } = await invoke(args);
        // If the exit status is not zero, an error occurred and the output may be
        // incomplete unless the command documentation notes otherwise. For example,
        // a command that creates multiple resources may only create a few, list them
        // on the standard output, and then exit with a non-zero status.
        // See https://cloud.google.com/sdk/docs/scripting-gcloud#best_practices
        let result = `gcloud process exited with code ${code}. stdout:\n${stdout}`;
        if (stderr) {
          result += `\nstderr:${stderr}`;
        }
        return {
          content: [
            {
              type: 'text',
              text: result,
            },
          ],
        };
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'An unknown error ocurred.';
        return {
          content: [
            {
              type: 'text',
              text: msg,
            },
          ],
          isError: true,
        };
      }
    },
  );
};
