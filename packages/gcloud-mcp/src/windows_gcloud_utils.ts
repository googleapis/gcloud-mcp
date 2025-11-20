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
import * as os from 'os';
import { log } from './utility/logger.js';

export interface WindowsCloudSDKSettings {
  cloudSdkRootDir: string;
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

export async function execWhereAsync(
  command: string,
  spawnEnv: { [key: string]: string | undefined },
): Promise<string[]> {
  return new Promise((resolve) => {
    child_process.exec(
      `where ${command}`,
      {
        encoding: 'utf8',
        env: spawnEnv, // Use updated PATH for where command
      },
      (error, stdout) => {
        if (error) {
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
      },
    );
  });
}

export function execWhere(
  command: string,
  spawnEnv: { [key: string]: string | undefined },
): string[] {
  try {
    const result = child_process
      .execSync(`where ${command}`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore'],
        env: spawnEnv, // Use updated PATH for where command
      })
      .trim();
    return result
      .split(/\r?\n/)
      .filter((line) => line.length > 0)
      .map((line) => path.win32.normalize(line));
  } catch {
    return [];
  }
}

export async function getPythonVersionAsync(
  pythonPath: string,
  spawnEnv: { [key: string]: string | undefined },
): Promise<string | undefined> {
  return new Promise((resolve) => {
    const escapedPath = pythonPath.includes(' ') ? `"${pythonPath}"` : pythonPath;
    const cmd = `${escapedPath} -c "import sys; print(sys.version)"`;
    child_process.exec(
      cmd,
      {
        encoding: 'utf8',
        env: spawnEnv, // Use env without PYTHONHOME
      },
      (error, stdout) => {
        if (error) {
          resolve(undefined);
          return;
        }
        const result = stdout.trim();
        resolve(result.split(/[\r\n]+/)[0]);
      },
    );
  });
}

export function getPythonVersion(
  pythonPath: string,
  spawnEnv: { [key: string]: string | undefined },
): string | undefined {
  try {
    const escapedPath = pythonPath.includes(' ') ? `"${pythonPath}"` : pythonPath;
    const cmd = `${escapedPath} -c "import sys; print(sys.version)"`;
    const result = child_process
      .execSync(cmd, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore'],
        env: spawnEnv, // Use env without PYTHONHOME
      })
      .trim();
    return result.split(/[\r\n]+/)[0];
  } catch {
    return undefined;
  }
}

export async function findWindowsPythonPathAsync(spawnEnv: {
  [key: string]: string | undefined;
}): Promise<string> {
  // Try to find a Python installation on Windows
  // Try Python, python3, python2

  const pythonCandidates = await execWhereAsync('python', spawnEnv);
  if (pythonCandidates.length > 0) {
    for (const candidate of pythonCandidates) {
      const version = await getPythonVersionAsync(candidate, spawnEnv);
      if (version && version.startsWith('3')) {
        return candidate;
      }
    }
  }

  const python3Candidates = await execWhereAsync('python3', spawnEnv);
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

export function findWindowsPythonPath(spawnEnv: { [key: string]: string | undefined }): string {
  // Try to find a Python installation on Windows
  // Try Python, python3, python2

  const pythonCandidates = execWhere('python', spawnEnv);
  if (pythonCandidates.length > 0) {
    for (const candidate of pythonCandidates) {
      const version = getPythonVersion(candidate, spawnEnv);
      if (version && version.startsWith('3')) {
        return candidate;
      }
    }
  }

  const python3Candidates = execWhere('python3', spawnEnv);
  if (python3Candidates.length > 0) {
    for (const candidate of python3Candidates) {
      const version = getPythonVersion(candidate, spawnEnv);
      if (version && version.startsWith('3')) {
        return candidate;
      }
    }
  }

  // Try to find python2 last
  if (pythonCandidates.length > 0) {
    for (const candidate of pythonCandidates) {
      const version = getPythonVersion(candidate, spawnEnv);
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
  const gcloudPathOutput = (await execWhereAsync('gcloud', env))[0];

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

export function getSDKRootDirectory(env: NodeJS.ProcessEnv): string {
  const cloudSdkRootDir = env['CLOUDSDK_ROOT_DIR'] || '';
  if (cloudSdkRootDir) {
    return path.win32.normalize(cloudSdkRootDir);
  }

  try {
    // Use 'where gcloud' to find the gcloud executable on Windows
    const gcloudPathOutput = execWhere('gcloud', env)[0];

    if (gcloudPathOutput) {
      // Assuming gcloud.cmd is in <SDK_ROOT>/bin/gcloud.cmd
      // We need to go up two levels from the gcloud.cmd path
      const binDir = path.win32.dirname(gcloudPathOutput);
      const sdkRoot = path.win32.dirname(binDir);
      return sdkRoot;
    }
  } catch {
    // gcloud not found in PATH, or other error
    log.warn(
      'gcloud not found in PATH. Please ensure Google Cloud SDK is installed and configured.',
    );
  }

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

  // Where.exe always exist in a Windows Platform
  let noWorkingPythonFound = false;
  // Juggling check to hit null and undefined at the same time
  if (!(await getPythonVersionAsync(cloudSdkPython, env))) {
    noWorkingPythonFound = true;
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
  cloudSdkPythonArgs = !cloudSdkPythonSitePackages
    ? `${argsWithoutS}${argsWithoutS ? ' ' : ''}-S`
    : argsWithoutS;
  
  const cloudSdkPythonArgsList = cloudSdkPythonArgs.split(" ") == undefined ? [] : cloudSdkPythonArgs.split(" ");

  return {
    cloudSdkRootDir,
    cloudSdkPython,
    cloudSdkPythonArgsList,
    noWorkingPythonFound,
    env,
  };
}

export function getWindowsCloudSDKSettings(
  currentEnv: NodeJS.ProcessEnv = process.env,
): WindowsCloudSDKSettings {
  const env = { ...currentEnv };
  const cloudSdkRootDir = getSDKRootDirectory(env);

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
    cloudSdkPython = findWindowsPythonPath(env);
  }

  // Where.exe always exist in a Windows Platform
  let noWorkingPythonFound = false;
  // Juggling check to hit null and undefined at the same time
  if (!getPythonVersion(cloudSdkPython, env)) {
    noWorkingPythonFound = true;
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
  cloudSdkPythonArgs = !cloudSdkPythonSitePackages
    ? `${argsWithoutS}${argsWithoutS ? ' ' : ''}-S`
    : argsWithoutS;

  return {
    cloudSdkRootDir,
    cloudSdkPython,
    cloudSdkPythonArgs,
    noWorkingPythonFound,
    env,
  };
}

export async function getCloudSDKSettingsAsync(): Promise<CloudSDKSettings> {
  const isWindowsPlatform = os.platform() === 'win32';
  return {
    isWindowsPlatform,
    windowsCloudSDKSettings: isWindowsPlatform ? await getWindowsCloudSDKSettingsAsync() : null,
  };
}

export function getCloudSDKSettings(): CloudSDKSettings {
  const isWindowsPlatform = os.platform() === 'win32';
  return {
    isWindowsPlatform,
    windowsCloudSDKSettings: isWindowsPlatform ? getWindowsCloudSDKSettings() : null,
  };
}
