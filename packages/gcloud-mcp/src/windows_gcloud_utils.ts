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
import * as fs from 'fs';
import * as path from 'path';
import { log } from './utility/logger.js';

export interface WindowsCloudSDKSettings {
  cloudSdkRootDir: string;
  gcloudPyPath: string;
  cloudSdkPython: string;
  cloudSdkPythonArgsList: string[];
  noWorkingPythonFound: boolean;
  /** Environment variables to use when spawning gcloud.py */
  env: { [key: string]: string | undefined };
}

export interface CloudSDKSettings {
  isWindowsPlatform: boolean;
  windowsCloudSDKSettings: WindowsCloudSDKSettings | null;
}

export async function spawnWhereAsync(
  command: string,
  spawnEnv: { [key: string]: string | undefined },
): Promise<string[]> {
  return new Promise((resolve) => {
    const child = child_process.spawn(
      'where',
      [command],
      {
        env: spawnEnv, // Use updated PATH for where command
        shell: true, // Use shell to handle command correctly
      },
    );

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('error', (error) => {
      log.error(`Failed to start 'where' subprocess: ${error.message}`);
      resolve([]);
    });

    child.on('close', (code) => {
      if (code !== 0) {
        log.error(`'where' command failed with code ${code}. Stderr: ${stderr}`);
        resolve([]);
        return;
      }
      const result = stdout.trim();
      resolve(
        result
          .split(/\r?\n/)
          .filter((line) => line.length > 0)
          .map((line) => path.win32.normalize(line)),
      );
    });
  });
}

export async function getPythonVersionAsync(
  pythonPath: string,
  spawnEnv: { [key: string]: string | undefined },
): Promise<string | undefined> {
  return new Promise((resolve) => {
    const escapedPath = pythonPath.includes(' ') ? `"${pythonPath}"` : pythonPath;
    const pythonArgs = ['-c', 'import sys; print(sys.version)'];
    const child = child_process.spawn(
      escapedPath,
      pythonArgs,
      {
        env: spawnEnv, // Use env without PYTHONHOME
      },
    );

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('error', (error) => {
      log.error(`Failed to start subprocess: ${error.message}`);
      resolve(undefined);
    });

    child.on('close', (code) => {
      if (code !== 0) {
        log.error(`Python version check failed with code ${code}. Stderr: ${stderr}`);
        resolve(undefined);
        return;
      }
      const result = stdout.trim();
      resolve(result.split(/[\n]+/)[0]);
    });
  });
}

export async function findWindowsPythonPathAsync(spawnEnv: {
  [key: string]: string | undefined;
}): Promise<string> {
  // Try to find a Python installation on Windows
  // Try Python, python3, python2

  const pythonCandidates = await spawnWhereAsync('python', spawnEnv);
  if (pythonCandidates.length > 0) {
    for (const candidate of pythonCandidates) {
      const version = await getPythonVersionAsync(candidate, spawnEnv);
      if (version && version.startsWith('3')) {
        return candidate;
      }
    }
  }

  const python3Candidates = await spawnWhereAsync('python3', spawnEnv);
  if (python3Candidates.length > 0) {
    for (const candidate of python3Candidates) {
      const version = await getPythonVersionAsync(candidate, spawnEnv);
      if (version && version.startsWith('3')) {
        return candidate;
      }
    }
  }

  // Try to find python2 last
  if (pythonCandidates.length > 0) {
    for (const candidate of pythonCandidates) {
      const version = await getPythonVersionAsync(candidate, spawnEnv);
      if (version && version.startsWith('2')) {
        return candidate;
      }
    }
  }
  return 'python.exe'; // Fallback to default python command
}

export async function getSDKRootDirectoryAsync(env: NodeJS.ProcessEnv): Promise<string> {
  const cloudSdkRootDir = env['CLOUDSDK_ROOT_DIR'] || '';
  if (cloudSdkRootDir) {
    return path.win32.normalize(cloudSdkRootDir);
  }

  // Use 'where gcloud' to find the gcloud executable on Windows
  const gcloudPathOutput = (await spawnWhereAsync('gcloud', env))[0];

  if (gcloudPathOutput) {
    // Assuming gcloud.cmd is in <SDK_ROOT>/bin/gcloud.cmd
    // We need to go up two levels from the gcloud.cmd path
    const binDir = path.win32.dirname(gcloudPathOutput);
    const sdkRoot = path.win32.dirname(binDir);
    return sdkRoot;
  }

  // gcloud not found in PATH, or other error
  log.warn('gcloud not found in PATH. Please ensure Google Cloud SDK is installed and configured.');

  return ''; // Return empty string if not found
}

export async function getWindowsCloudSDKSettingsAsync(
  currentEnv: NodeJS.ProcessEnv = process.env,
): Promise<WindowsCloudSDKSettings> {
  const env = { ...currentEnv };
  const cloudSdkRootDir = await getSDKRootDirectoryAsync(env);

  let cloudSdkPython = env['CLOUDSDK_PYTHON'] || '';
  // Find bundled python if no python is set in the environment.
  if (!cloudSdkPython) {
    const bundledPython = path.win32.join(
      cloudSdkRootDir,
      'platform',
      'bundledpython',
      'python.exe',
    );
    if (fs.existsSync(bundledPython)) {
      cloudSdkPython = bundledPython;
    }
  }
  // If not bundled Python is found, try to find a Python installation on windows
  if (!cloudSdkPython) {
    cloudSdkPython = await findWindowsPythonPathAsync(env);
  }

  // Check if the User has site package enabled
  let cloudSdkPythonSitePackages = currentEnv['CLOUDSDK_PYTHON_SITEPACKAGES'];
  if (cloudSdkPythonSitePackages === undefined) {
    if (currentEnv['VIRTUAL_ENV']) {
      cloudSdkPythonSitePackages = '1';
    } else {
      cloudSdkPythonSitePackages = '';
    }
  } else if (cloudSdkPythonSitePackages === null) {
    cloudSdkPythonSitePackages = '';
  }

  let cloudSdkPythonArgs = env['CLOUDSDK_PYTHON_ARGS'] || '';
  const argsWithoutS = cloudSdkPythonArgs.replace('-S', '').trim();

  // Spacing here matters
  // When site pacakge is set, invoke without -S
  // otherwise, invoke with -S
  cloudSdkPythonArgs = !cloudSdkPythonSitePackages
    ? `${argsWithoutS}${argsWithoutS ? ' ' : ''}-S`
    : argsWithoutS;

  const cloudSdkPythonArgsList = cloudSdkPythonArgs ? cloudSdkPythonArgs.split(' ') : [];

  const gcloudPyPath = path.join(
    cloudSdkRootDir,
    'lib',
    'gcloud.py',
  );

  return {
    cloudSdkRootDir,
    gcloudPyPath,
    cloudSdkPython,
    cloudSdkPythonArgsList,
    noWorkingPythonFound: !cloudSdkPython,
    env,
  };
}