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
import * as child_process from 'child_process';

export const isWindows = (): boolean => process.platform === 'win32';

export const isAvailable = (): boolean => findExecutablePath('gcloud') !== null;

export const findExecutablePath = (exeName: string): string | null => {
  try {
    const output = child_process.execFileSync(isWindows() ? 'where' : 'which', [exeName], {
      encoding: 'utf8',
      windowsHide: true, // Don't flash a console window on Windows
      timeout: 3000,
    });
    const lines = output.split(/\r?\n/).filter((line) => line.trim() !== '');
    return lines[0]?.trim() ?? null;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e) {
    // This catch block handles all errors:
    // 1. 'which'/'where' not found (ENOENT)
    // 2. Command times out
    // 3. Command returns non-zero exit code (e.g., executable not found)
    // In all these "failure" cases, we safely return null.
    return null;
  }
};

export interface GcloudInvocationResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

const createProcess = async (args: string[]): Promise<child_process.ChildProcess> => {
  const stdio: child_process.StdioOptions = ['ignore', 'pipe', 'pipe'];

  if (isWindows()) {
    const cmdPath = findExecutablePath('cmd.exe');
    if (!cmdPath) {
      throw new Error('unable to find path to cmd.exe');
    }

    const gcloudPath = findExecutablePath('gcloud');
    if (!gcloudPath) {
      throw new Error('unable to find path to gcloud');
    }

    return child_process.spawn(gcloudPath, args, {
      stdio,
      env: {
        ...process.env,
        COMSPEC: cmdPath,
      },
    });
  }

  return child_process.spawn('gcloud', args, { stdio });
};

export const invoke = (args: string[]): Promise<GcloudInvocationResult> =>
  new Promise(async (resolve, reject) => {
    let stdout = '';
    let stderr = '';

    const gcloud = await createProcess(args);

    gcloud.stdout?.on('data', (data) => {
      stdout += data.toString();
    });
    gcloud.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    gcloud.on('close', (code) => {
      // All responses from gcloud, including non-zero codes.
      resolve({ code, stdout, stderr });
    });
    gcloud.on('error', (err) => {
      // Process failed to start. gcloud isn't able to be invoked.
      reject(err);
    });
  });

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

export const lint = async (command: string): Promise<ParsedGcloudLintResult> => {
  const { code, stdout, stderr } = await invoke([
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
};
