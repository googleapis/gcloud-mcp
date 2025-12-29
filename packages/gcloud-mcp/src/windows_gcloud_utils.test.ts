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

import { describe, it, expect, vi, beforeEach, afterEach, MockInstance } from 'vitest';
import * as child_process from 'child_process';
import { ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import {
  spawnWhereAsync,
  getPythonVersionAsync,
  findWindowsPythonPathAsync,
  getSDKRootDirectoryAsync,
  getWindowsCloudSDKSettingsAsync,
} from './windows_gcloud_utils.js';
import { FakeChildProcess, createMockChildProcess } from './utility/test_utils.js';

vi.mock('child_process');
vi.mock('fs');
vi.mock('os');

describe('windows_gcloud_utils', () => {
  // Using 'any' to avoid overload issues with childProcess.spawn mocks
  type SpawnFn = typeof child_process.spawn;
  let spawnSpy: MockInstance<SpawnFn>;

  beforeEach(() => {
    vi.clearAllMocks();
    // Cast to 'any' to simplify type checking against overloaded function
    spawnSpy = vi.spyOn(child_process, 'spawn');
    // Default mock return value. The cast is on the argument.
    const defaultFakeProcess = new FakeChildProcess();
    spawnSpy.mockReturnValue(defaultFakeProcess as unknown as ChildProcess);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('spawnWhereAsync', () => {
    it('should return paths when command is found', async () => {
      spawnSpy.mockReturnValue(
        createMockChildProcess(
          'C:\\Program Files\\Python\\Python39\\python.exe\r\nC:\\Users\\user\\AppData\\Local\\Programs\\Python\\Python38\\python.exe',
        ),
      );
      const result = await spawnWhereAsync('command', {});
      expect(result).toStrictEqual(
        [
          'C:\\Program Files\\Python\\Python39\\python.exe',
          'C:\\Users\\user\\AppData\\Local\\Programs\\Python\\Python38\\python.exe',
        ].map((p) => path.win32.normalize(p)),
      );
    });

    it('should return empty array when command is not found', async () => {
      spawnSpy.mockReturnValue(createMockChildProcess('', 'not found', 1));
      const result = await spawnWhereAsync('command', {});
      expect(result).toStrictEqual([]);
    });
  });

  describe('getPythonVersionAsync', () => {
    it('should return python version', async () => {
      spawnSpy.mockReturnValue(createMockChildProcess('3.9.0'));
      const version = await getPythonVersionAsync('python', {});
      expect(version).toBe('3.9.0');
    });

    it('should return undefined if python not found', async () => {
      spawnSpy.mockReturnValue(createMockChildProcess('', 'not found', 1));
      const version = await getPythonVersionAsync('python', {});
      expect(version).toBeUndefined();
    });
  });

  describe('findWindowsPythonPathAsync', () => {
    it('should find python3 when multiple python versions are present', async () => {
      spawnSpy
        .mockReturnValueOnce(
          createMockChildProcess('C:\\Python27\\python.exe\r\nC:\\Python39\\python.exe'),
        )
        .mockReturnValueOnce(createMockChildProcess('2.7.18'))
        .mockReturnValueOnce(createMockChildProcess('3.9.5'));

      const pythonPath = await findWindowsPythonPathAsync({});
      expect(pythonPath).toBe('C:\\Python39\\python.exe');
    });

    it('should return default python.exe if no python is found', async () => {
      spawnSpy
        .mockReturnValueOnce(createMockChildProcess('', 'not found', 1))
        .mockReturnValueOnce(createMockChildProcess('', 'not found', 1));
      const pythonPath = await findWindowsPythonPathAsync({});
      expect(pythonPath).toBe('python.exe');
    });

    it('should find python2 if no python3 is available', async () => {
      spawnSpy
        .mockReturnValueOnce(createMockChildProcess('C:\\Python27\\python.exe')) // where python
        .mockReturnValueOnce(createMockChildProcess('2.7.18')) // python -c 'import sys; print(sys.version)'
        .mockReturnValueOnce(createMockChildProcess('', 'not found', 1)) // where python3
        .mockReturnValueOnce(createMockChildProcess('2.7.18')); // python -c 'import sys; print(sys.version)' for py2 check

      const pythonPath = await findWindowsPythonPathAsync({});
      expect(pythonPath).toBe('C:\\Python27\\python.exe');
    });
  });

  describe('getSDKRootDirectoryAsync', () => {
    it('should get root directory from CLOUDSDK_ROOT_DIR', async () => {
      const sdkRoot = await getSDKRootDirectoryAsync({
        CLOUDSDK_ROOT_DIR: 'sdk_root',
      });
      expect(sdkRoot).toBe(path.win32.normalize('sdk_root'));
    });

    it('should get root directory from where gcloud', async () => {
      spawnSpy.mockReturnValue(
        createMockChildProcess('C:\\Program Files\\Google\\Cloud SDK\\bin\\gcloud.cmd'),
      );
      const sdkRoot = await getSDKRootDirectoryAsync({});
      expect(sdkRoot).toBe(path.win32.normalize('C:\\Program Files\\Google\\Cloud SDK'));
    });

    it('should return empty string if gcloud not found', async () => {
      spawnSpy.mockReturnValue(createMockChildProcess('', 'not found', 1));
      const sdkRoot = await getSDKRootDirectoryAsync({});
      expect(sdkRoot).toBe('');
    });
  });

  describe('getWindowsCloudSDKSettingsAsync', () => {
    it('should get settings with bundled python', async () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      spawnSpy.mockReturnValue(createMockChildProcess('3.9.0'));

      const settings = await getWindowsCloudSDKSettingsAsync({
        CLOUDSDK_ROOT_DIR: 'C:\\CloudSDK',
        CLOUDSDK_PYTHON_SITEPACKAGES: '',
      });

      expect(settings.cloudSdkRootDir).toBe(path.win32.normalize('C:\\CloudSDK'));
      expect(settings.cloudSdkPython).toBe(
        path.win32.normalize('C:\\CloudSDK\\platform\\bundledpython\\python.exe'),
      );
      expect(settings.cloudSdkPythonArgsList).toStrictEqual(['-S']);
      expect(settings.noWorkingPythonFound).toBe(false);
    });

    it('should get settings with CLOUDSDK_PYTHON and site packages enabled', async () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(false);
      spawnSpy.mockReturnValue(createMockChildProcess('3.9.0'));
      const settings = await getWindowsCloudSDKSettingsAsync({
        CLOUDSDK_ROOT_DIR: 'C:\\CloudSDK',
        CLOUDSDK_PYTHON: 'C:\\Python39\\python.exe',
        CLOUDSDK_PYTHON_SITEPACKAGES: '1',
      });

      expect(settings.cloudSdkRootDir).toBe(path.win32.normalize('C:\\CloudSDK'));
      expect(settings.cloudSdkPython).toBe('C:\\Python39\\python.exe');
      expect(settings.cloudSdkPythonArgsList).toStrictEqual([]);
      expect(settings.noWorkingPythonFound).toBe(false);
    });

    it('should set noWorkingPythonFound to true if python version cannot be determined', async () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(false);
      spawnSpy.mockReturnValue(createMockChildProcess('', 'whoops', 1));

      const settings = await getWindowsCloudSDKSettingsAsync({
        CLOUDSDK_ROOT_DIR: 'C:\\CloudSDK',
        CLOUDSDK_PYTHON: 'C:\\NonExistentPython\\python.exe',
      });

      expect(settings.noWorkingPythonFound).toBe(true);
    });

    it('should handle VIRTUAL_ENV for site packages', async () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(false);
      spawnSpy.mockReturnValue(createMockChildProcess('3.9.0'));

      const settings = await getWindowsCloudSDKSettingsAsync({
        CLOUDSDK_ROOT_DIR: 'C:\\CloudSDK',
        CLOUDSDK_PYTHON: 'C:\\Python39\\python.exe',
        VIRTUAL_ENV: 'C:\\MyVirtualEnv',
        CLOUDSDK_PYTHON_SITEPACKAGES: undefined,
      });
      expect(settings.cloudSdkPythonArgsList).toStrictEqual([]);
    });

    it('should keep existing CLOUDSDK_PYTHON_ARGS and add -S if no site packages', async () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      spawnSpy.mockReturnValue(createMockChildProcess('3.9.0'));

      const settings = await getWindowsCloudSDKSettingsAsync({
        CLOUDSDK_ROOT_DIR: 'C:\\CloudSDK',
        CLOUDSDK_PYTHON_ARGS: '-v',
        CLOUDSDK_PYTHON_SITEPACKAGES: '',
      });
      expect(settings.cloudSdkPythonArgsList).toStrictEqual(['-v', '-S']);
    });

    it('should remove -S from CLOUDSDK_PYTHON_ARGS if site packages enabled', async () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      spawnSpy.mockReturnValue(createMockChildProcess('3.9.0'));

      const settings = await getWindowsCloudSDKSettingsAsync({
        CLOUDSDK_ROOT_DIR: 'C:\\CloudSDK',
        CLOUDSDK_PYTHON_ARGS: '-v -S',
        CLOUDSDK_PYTHON_SITEPACKAGES: '1',
      });
      expect(settings.cloudSdkPythonArgsList).toStrictEqual(['-v']);
    });
  });
});
