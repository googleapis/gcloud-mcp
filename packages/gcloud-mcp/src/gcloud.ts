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
import * as path from 'path';
import {
  getCloudSDKSettingsAsync as getRealCloudSDKSettingsAsync,
  CloudSDKSettings,
} from './windows_gcloud_utils.js';

export const isWindows = (): boolean => process.platform === 'win32';

let memoizedCloudSDKSettings: CloudSDKSettings | undefined;

export async function getMemoizedCloudSDKSettingsAsync(): Promise<CloudSDKSettings> {
  if (!memoizedCloudSDKSettings) {
    memoizedCloudSDKSettings = await getRealCloudSDKSettingsAsync();
  }
  return memoizedCloudSDKSettings;
}

export const isAvailable = (): Promise<boolean> =>
  new Promise((resolve) => {
    const which = child_process.spawn(isWindows() ? 'where' : 'which', ['gcloud']);
    which.on('close', (code) => {
      resolve(code === 0);
    });
    which.on('error', () => {
      resolve(false);
    });
  });

export interface GcloudInvocationResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

export const getPlatformSpecificGcloudCommand = async (
  args: string[],
): Promise<{ command: string; args: string[] }> => {
  const cloudSDKSettings = await getMemoizedCloudSDKSettingsAsync();
  if (cloudSDKSettings.isWindowsPlatform && cloudSDKSettings.windowsCloudSDKSettings) {
    const windowsPathForGcloudPy = path.win32.join(
      cloudSDKSettings.windowsCloudSDKSettings?.cloudSdkRootDir,
      'lib',
      'gcloud.py',
    );
    const pythonPath = path.win32.normalize(
      cloudSDKSettings.windowsCloudSDKSettings?.cloudSdkPython,
    );

    return {
      command: pythonPath,
      args: [
        ...cloudSDKSettings.windowsCloudSDKSettings?.cloudSdkPythonArgsList,
        windowsPathForGcloudPy,
        ...args,
      ],
    };
  } else {
    return { command: 'gcloud', args };
  }
};

export const invoke = async (args: string[]): Promise<GcloudInvocationResult> =>
  new Promise(async (resolve, reject) => {
    let stdout = '';
    let stderr = '';

    const { command, args: executionArgs } = await getPlatformSpecificGcloudCommand(args);

    const gcloud = child_process.spawn(command, executionArgs, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    gcloud.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    gcloud.stderr.on('data', (data) => {
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
