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

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as child_process from 'child_process';
import { PassThrough } from 'stream';
import { ChildProcessWithoutNullStreams } from 'child_process';
import { findExecutable, isAvailable, isWindows } from './gcloud_executor';
import * as windows_gcloud_utils from './windows_gcloud_utils';
import { WindowsCloudSDKSettings } from './windows_gcloud_utils';

vi.mock('child_process');
vi.mock('./windows_gcloud_utils');

describe('gcloud_executor', () => {
  let spawn: vi.Mock;

  beforeEach(() => {
    spawn = vi.spyOn(child_process, 'spawn').mockReturnValue({
      stdout: new PassThrough(),
      stderr: new PassThrough(),
      on: vi.fn((event, cb) => {
        if (event === 'close') {
          cb(0);
        }
      }),
    } as ChildProcessWithoutNullStreams);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const mockSpawn = (stdout: string, stderr = '', exitCode = 0): ChildProcessWithoutNullStreams => {
    const process = {
      stdout: new PassThrough(),
      stderr: new PassThrough(),
      on: vi.fn((event, cb) => {
        if (event === 'close') {
          setTimeout(() => cb(exitCode), 10);
        }
      }),
    };
    process.stdout.write(stdout);
    process.stderr.write(stderr);
    process.stdout.end();
    process.stderr.end();
    return process as ChildProcessWithoutNullStreams;
  };

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
      spawn.mockReturnValue(mockSpawn('', '', 0));
      await expect(isAvailable()).resolves.toBe(true);
    });

    it('should resolve false when "which gcloud" fails', async () => {
      spawn.mockReturnValue(mockSpawn('', '', 1));
      await expect(isAvailable()).resolves.toBe(false);
    });

    it('should resolve false on spawn error', async () => {
      spawn.mockReturnValue({
        on: vi.fn((event, cb) => {
          if (event === 'error') {
            cb(new Error('spawn error'));
          }
        }),
      } as ChildProcessWithoutNullStreams);
      await expect(isAvailable()).resolves.toBe(false);
    });
  });

  describe('findExecutable', () => {
    it('should create a direct executor for non-Windows platforms', async () => {
      Object.defineProperty(process, 'platform', {
        value: 'linux',
      });
      spawn.mockReturnValueOnce(mockSpawn('', '', 0)); // for isAvailable
      spawn.mockReturnValueOnce(mockSpawn('test stdout', '', 0));

      const executor = await findExecutable();
      const result = await executor.execute(['test']);

      expect(result).toEqual({
        code: 0,
        stdout: 'test stdout',
        stderr: '',
      });
      expect(spawn).toHaveBeenCalledWith('gcloud', ['test'], {
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
      });

      spawn.mockReturnValueOnce(mockSpawn('', '', 0)); // for isAvailable
      spawn.mockReturnValueOnce(mockSpawn('windows stdout', '', 0));

      const executor = await findExecutable();
      const result = await executor.execute(['test']);

      expect(result).toEqual({
        code: 0,
        stdout: 'windows stdout',
        stderr: '',
      });
      expect(spawn).toHaveBeenCalledWith(
        'C:\\Python\\python.exe',
        ['C:\\gcloud\\gcloud.py', 'test'],
        { stdio: ['ignore', 'pipe', 'pipe'] },
      );
    });

    it('should throw an error if gcloud is not available', async () => {
      spawn.mockReturnValue(mockSpawn('', '', 1));
      await expect(findExecutable()).rejects.toThrow('gcloud executable not found');
    });

    it('should throw an error if no working Python is found on Windows', async () => {
      Object.defineProperty(process, 'platform', {
        value: 'win32',
      });
      vi.mocked(windows_gcloud_utils.getWindowsCloudSDKSettingsAsync).mockResolvedValue({
        noWorkingPythonFound: true,
      } as WindowsCloudSDKSettings);
      spawn.mockReturnValueOnce(mockSpawn('', '', 0)); // For isAvailable

      await expect(findExecutable()).rejects.toThrow(
        'no working Python installation found for Windows gcloud execution.',
      );
    });

    it('should reject when the gcloud process fails to start', async () => {
      Object.defineProperty(process, 'platform', {
        value: 'linux',
      });
      spawn.mockReturnValueOnce(mockSpawn('', '', 0)); // isAvailable
      spawn.mockReturnValueOnce({
        stdout: new PassThrough(),
        stderr: new PassThrough(),
        on: vi.fn((event, cb) => {
          if (event === 'error') {
            cb(new Error('Process failed'));
          }
        }),
      } as ChildProcessWithoutNullStreams);

      const executor = await findExecutable();
      await expect(executor.execute(['test'])).rejects.toThrow('Process failed');
    });
  });
});
