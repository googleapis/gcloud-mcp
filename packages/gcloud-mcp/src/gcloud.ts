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

import { z } from 'zod';
import { findExecutable } from './gcloud_executor.js';

export interface GcloudExecutable {
  invoke: (args: string[]) => Promise<GcloudInvocationResult>;
  lint: (command: string) => Promise<ParsedGcloudLintResult>;
}

export const create = async (): Promise<GcloudExecutable> => {
  const gcloud = await findExecutable();

  return {
    invoke: gcloud.execute,
    lint: async (command: string): Promise<ParsedGcloudLintResult> => {
      const { code, stdout, stderr } = await gcloud.execute([
        'meta',
        'lint-gcloud-commands',
        '--command-string',
        `gcloud ${command}`,
      ]);

      const json = JSON.parse(stdout);
      const lintCommands: LintCommandsOutput = LintCommandsSchema.parse(json);
      const lintCommand = lintCommands[0];
      if (!lintCommand) {
        throw new Error('gcloud lint result contained no contents');
      }

      // gcloud returned a non-zero response
      if (code !== 0) {
        return { success: false, error: stderr };
      }

      // Command has bad syntax
      if (!lintCommand.success) {
        let error = `${lintCommand.error_message}`;
        if (lintCommand.error_type) {
          error = `${lintCommand.error_type}: ${error}`;
        }
        return { success: false, error };
      }

      // Else, success.
      return {
        success: true,
        // Remove gcloud prefix since we added it in during the invocation, above.
        parsedCommand: lintCommand.command_string_no_args.slice('gcloud '.length),
      };
    }
  }
}

export interface GcloudInvocationResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

// There are more fields in this object, but we're only parsing the ones currently in use.
const LintCommandSchema = z.object({
  command_string_no_args: z.string(),
  success: z.boolean(),
  error_message: z.string().nullable(),
  error_type: z.string().nullable(),
});
const LintCommandsSchema = z.array(LintCommandSchema);
type LintCommandsOutput = z.infer<typeof LintCommandsSchema>;
export type LintCommandOutput = z.infer<typeof LintCommandSchema>;

export type ParsedGcloudLintResult =
  | {
      success: true;
      parsedCommand: string;
    }
  | {
      success: false;
      error: string;
    };

