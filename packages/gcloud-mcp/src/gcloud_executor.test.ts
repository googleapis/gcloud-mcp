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

import { describe, it, expect, beforeEach, afterEach, vi, MockInstance } from 'vitest';
import * as child_process from 'child_process';
import { ChildProcess } from 'child_process';
import { findExecutable, isAvailable, isWindows } from './gcloud_executor.js';
import * as windows_gcloud_utils from './windows_gcloud_utils.js';
import { FakeChildProcess, createMockChildProcess } from './utility/test_utils.js';

vi.mock('child_process');
vi.mock('./windows_gcloud_utils');

describe('gcloud_executor', () => {
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

  describe('isWindows', () => {
    it('should return true if platform is win32', () => {
      Object.defineProperty(process, 'platform', {
        value: 'win32',
      });
      expect(isWindows()).toBe(true);
    });

    it('should return false if platform is not win32', () => {
      Object.defineProperty(process, 'platform', {
        value: 'linux',
      });
      expect(isWindows()).toBe(false);
    });
  });

  describe('isAvailable', () => {
    it('should resolve true when "which gcloud" succeeds', async () => {
      spawnSpy.mockReturnValue(createMockChildProcess('', '', 0));
      await expect(isAvailable()).resolves.toBe(true);
    });

    it('should resolve false when "which gcloud" fails', async () => {
      spawnSpy.mockReturnValue(createMockChildProcess('', '', 1));
      await expect(isAvailable()).resolves.toBe(false);
    });

    it('should resolve false on spawn error', async () => {
      const fakeProcess = new FakeChildProcess();
      spawnSpy.mockReturnValue(fakeProcess as unknown as ChildProcess);
      const error = new Error('spawn error');
      setTimeout(() => {
        fakeProcess.emit('error', error);
      }, 0);
      await expect(isAvailable()).resolves.toBe(false);
    });
  });

  describe('findExecutable', () => {
    it('should create a direct executor for non-Windows platforms', async () => {
      Object.defineProperty(process, 'platform', {
        value: 'linux',
      });
      spawnSpy.mockReturnValueOnce(createMockChildProcess('', '', 0)); // for isAvailable
      spawnSpy.mockReturnValueOnce(createMockChildProcess('test stdout', '', 0));

      const executor = await findExecutable();
      const result = await executor.execute(['test']);

      expect(result).toEqual({
        code: 0,
        stdout: 'test stdout',
        stderr: '',
      });
      expect(spawnSpy).toHaveBeenCalledWith('gcloud', ['test'], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    });

    it('should create a Windows executor when on Windows', async () => {
      Object.defineProperty(process, 'platform', {
        value: 'win32',
      });

      vi.mocked(windows_gcloud_utils.getWindowsCloudSDKSettingsAsync).mockResolvedValue({
        gcloudPyPath: 'C:\\gcloud\\gcloud.py',
        cloudSdkPython: 'C:\\Python\\python.exe',
        cloudSdkPythonArgsList: [],
        noWorkingPythonFound: false,
        cloudSdkRootDir: 'C:\\gcloud',
        env: {},
      } as windows_gcloud_utils.WindowsCloudSDKSettings);

      spawnSpy.mockReturnValueOnce(createMockChildProcess('', '', 0)); // for isAvailable
      spawnSpy.mockReturnValueOnce(createMockChildProcess('windows stdout', '', 0));

      const executor = await findExecutable();
      const result = await executor.execute(['test']);

      expect(result).toEqual({
        code: 0,
        stdout: 'windows stdout',
        stderr: '',
      });
      expect(spawnSpy).toHaveBeenCalledWith(
        'C:\\Python\\python.exe',
        ['C:\\gcloud\\gcloud.py', 'test'],
        { stdio: ['ignore', 'pipe', 'pipe'] },
      );
    });

    it('should throw an error if gcloud is not available', async () => {
      spawnSpy.mockReturnValue(createMockChildProcess('', '', 1));
      await expect(findExecutable()).rejects.toThrow('gcloud executable not found');
    });

    it('should throw an error if no working Python is found on Windows', async () => {
      Object.defineProperty(process, 'platform', {
        value: 'win32',
      });
      vi.mocked(windows_gcloud_utils.getWindowsCloudSDKSettingsAsync).mockResolvedValue({
        noWorkingPythonFound: true,
      } as windows_gcloud_utils.WindowsCloudSDKSettings);
      spawnSpy.mockReturnValueOnce(createMockChildProcess('', '', 0)); // For isAvailable

      await expect(findExecutable()).rejects.toThrow(
        'no working Python installation found for Windows gcloud execution.',
      );
    });

    it('should reject when the gcloud process fails to start', async () => {
      Object.defineProperty(process, 'platform', {
        value: 'linux',
      });
      spawnSpy.mockReturnValueOnce(createMockChildProcess('', '', 0)); // isAvailable

      const fakeProcess = new FakeChildProcess();
      spawnSpy.mockReturnValueOnce(fakeProcess as unknown as ChildProcess);

      const executor = await findExecutable();
      const error = new Error('Process failed');

      setTimeout(() => {
        fakeProcess.emit('error', error);
      }, 0);

      await expect(executor.execute(['test'])).rejects.toThrow('Process failed');
    });
  });
});
