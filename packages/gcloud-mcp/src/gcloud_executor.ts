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

import * as child_process from 'child_process';
import { getWindowsCloudSDKSettingsAsync } from './windows_gcloud_utils.js';
import * as path from 'path';

export const isWindows = (): boolean => process.platform === 'win32';

export interface GcloudExecutionResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

export interface GcloudExecutor {
  execute: (args: string[]) => Promise<GcloudExecutionResult>;
}

export const findExecutable = async (): Promise<GcloudExecutor> => {
  const executor = await createExecutor();
  return {
    execute: async (args: string[]): Promise<GcloudExecutionResult> =>
      new Promise(async (resolve, reject) => {
        let stdout = '';
        let stderr = '';

        const gcloud = executor.execute(args);

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
      }),
  };
};

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

const createExecutor = async () => {
  if (!(await isAvailable())) {
    throw Error('gcloud executable not found');
  }
  if (isWindows()) {
    return await createWindowsExecutor();
  }
  return createDirectExecutor();
};

/** Creates an executor that directly invokes the gcloud binary on the current PATH. */
const createDirectExecutor = () => ({
  execute: (args: string[]) =>
    child_process.spawn('gcloud', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    }),
});

const createWindowsExecutor = async () => {
  const settings = await getWindowsCloudSDKSettingsAsync();

  if (settings == null || settings.noWorkingPythonFound) {
    throw Error('no working Python installation found for Windows gcloud execution.');
  }

  const pythonPath = path.normalize(settings.cloudSdkPython);

  return {
    execute: (args: string[]) =>
      child_process.spawn(
        pythonPath,
        [...settings.cloudSdkPythonArgsList, settings.gcloudPyPath, ...args],
        {
          stdio: ['ignore', 'pipe', 'pipe'],
        },
      ),
  };
};
