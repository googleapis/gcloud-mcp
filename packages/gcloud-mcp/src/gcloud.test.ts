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

import { test, expect, beforeEach, Mock, vi, assert } from 'vitest';
import * as child_process from 'child_process';
import { PassThrough } from 'stream';
import * as path from 'path'; // Import path module

let gcloud: typeof import('./gcloud.js');
let isWindows: typeof import('./gcloud.js').isWindows;

vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

const mockedSpawn = child_process.spawn as unknown as Mock;
let mockedGetCloudSDKSettings: Mock;

beforeEach(async () => {
  vi.clearAllMocks();
  vi.resetModules(); // Clear module cache before each test
  vi.resetModules(); // Clear module cache before each test

  // Explicitly mock windows_gcloud_utils.js here to ensure it's active before gcloud.js is imported.
  vi.doMock('./windows_gcloud_utils.js', () => ({
    getCloudSDKSettings: vi.fn(),
  }));
  mockedGetCloudSDKSettings = (await import('./windows_gcloud_utils.js'))
    .getCloudSDKSettings as unknown as Mock;

  // Dynamically import gcloud.js after mocks are set up.
  gcloud = await import('./gcloud.js');
  isWindows = gcloud.isWindows;
});

test('getPlatformSpecificGcloudCommand should return gcloud command for non-windows platform', () => {
  mockedGetCloudSDKSettings.mockReturnValue({
    isWindowsPlatform: false,
    windowsCloudSDKSettings: null,
  });
  const { command, args } = gcloud.getPlatformSpecificGcloudCommand([
    'test',
    '--project=test-project',
  ]);
  expect(command).toBe('gcloud');
  expect(args).toEqual(['test', '--project=test-project']);
});

test('getPlatformSpecificGcloudCommand should return python command for windows platform', () => {
  const cloudSdkRootDir = 'C:\\Users\\test\\AppData\\Local\\Google\\Cloud SDK';
  const cloudSdkPython = path.win32.join(
    cloudSdkRootDir,
    'platform',
    'bundledpython',
    'python.exe',
  );
  const gcloudPyPath = path.win32.join(cloudSdkRootDir, 'lib', 'gcloud.py');

  mockedGetCloudSDKSettings.mockReturnValue({
    isWindowsPlatform: true,
    windowsCloudSDKSettings: {
      cloudSdkRootDir,
      cloudSdkPython,
      cloudSdkPythonArgs: '-S',
    },
  });
  const { command, args } = gcloud.getPlatformSpecificGcloudCommand([
    'test',
    '--project=test-project',
  ]);
  expect(command).toBe(path.win32.normalize(cloudSdkPython));
  expect(args).toEqual(['-S', gcloudPyPath, 'test', '--project=test-project']);
});

test('invoke should call gcloud with the correct arguments on non-windows platform', async () => {
  const mockChildProcess = {
    stdout: new PassThrough(),
    stderr: new PassThrough(),
    stdin: new PassThrough(),
    on: vi.fn((event, callback) => {
      if (event === 'close') {
        setTimeout(() => callback(0), 0);
      }
    }),
  };
  mockedSpawn.mockReturnValue(mockChildProcess);
  mockedGetCloudSDKSettings.mockReturnValue({
    isWindowsPlatform: false,
    windowsCloudSDKSettings: null,
  });

  const resultPromise = gcloud.invoke(['test', '--project=test-project']);
  mockChildProcess.stdout.end();
  await resultPromise;

  expect(mockedSpawn).toHaveBeenCalledWith('gcloud', ['test', '--project=test-project'], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
});

test('invoke should call python with the correct arguments on windows platform', async () => {
  const mockChildProcess = {
    stdout: new PassThrough(),
    stderr: new PassThrough(),
    stdin: new PassThrough(),
    on: vi.fn((event, callback) => {
      if (event === 'close') {
        setTimeout(() => callback(0), 0);
      }
    }),
  };
  mockedSpawn.mockReturnValue(mockChildProcess);
  mockedGetCloudSDKSettings.mockReturnValue({
    isWindowsPlatform: true,
    windowsCloudSDKSettings: {
      cloudSdkRootDir: 'C:\\Users\\test\\AppData\\Local\\Google\\Cloud SDK',
      cloudSdkPython:
        'C:\\Users\\test\\AppData\\Local\\Google\\Cloud SDK\\platform\\bundledpython\\python.exe',
      cloudSdkPythonArgs: '-S',
    },
  });

  const resultPromise = gcloud.invoke(['test', '--project=test-project']);
  mockChildProcess.stdout.end();
  await resultPromise;

  expect(mockedSpawn).toHaveBeenCalledWith(
    path.win32.normalize(
      'C:\\Users\\test\\AppData\\Local\\Google\\Cloud SDK\\platform\\bundledpython\\python.exe',
    ),
    [
      '-S',
      path.win32.normalize('C:\\Users\\test\\AppData\\Local\\Google\\Cloud SDK\\lib\\gcloud.py'),
      'test',
      '--project=test-project',
    ],
    {
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
});

test('should return true if which command succeeds', async () => {
  const mockChildProcess = {
    on: vi.fn((event, callback) => {
      if (event === 'close') {
        setTimeout(() => callback(0), 0);
      }
    }),
  };
  mockedSpawn.mockReturnValue(mockChildProcess);
  mockedGetCloudSDKSettings.mockReturnValue({
    isWindowsPlatform: false,
    windowsCloudSDKSettings: null,
  });

  const result = await gcloud.isAvailable();

  expect(result).toBe(true);
  if (isWindows()) {
    expect(mockedSpawn).toHaveBeenCalledWith('where', ['gcloud']);
  } else {
    expect(mockedSpawn).toHaveBeenCalledWith('which', ['gcloud']);
  }
});

test('should return false if which command fails with non-zero exit code', async () => {
  const mockChildProcess = {
    on: vi.fn((event, callback) => {
      if (event === 'close') {
        setTimeout(() => callback(1), 0);
      }
    }),
  };
  mockedSpawn.mockReturnValue(mockChildProcess);

  const result = await gcloud.isAvailable();

  expect(result).toBe(false);
  if (isWindows()) {
    expect(mockedSpawn).toHaveBeenCalledWith('where', ['gcloud']);
  } else {
    expect(mockedSpawn).toHaveBeenCalledWith('which', ['gcloud']);
  }
});

test('should return false if which command fails', async () => {
  const mockChildProcess = {
    on: vi.fn((event, callback) => {
      if (event === 'error') {
        setTimeout(() => callback(new Error('Failed to start')), 0);
      }
    }),
  };
  mockedSpawn.mockReturnValue(mockChildProcess);

  const result = await gcloud.isAvailable();

  expect(result).toBe(false);
  if (isWindows()) {
    expect(mockedSpawn).toHaveBeenCalledWith('where', ['gcloud']);
  } else {
    expect(mockedSpawn).toHaveBeenCalledWith('which', ['gcloud']);
  }
});

test('should correctly handle stdout and stderr', async () => {
  const mockChildProcess = {
    stdout: new PassThrough(),
    stderr: new PassThrough(),
    stdin: new PassThrough(),
    on: vi.fn((event, callback) => {
      if (event === 'close') {
        setTimeout(() => callback(0), 0);
      }
    }),
  };
  mockedSpawn.mockReturnValue(mockChildProcess);
  mockedGetCloudSDKSettings.mockReturnValue({
    isWindowsPlatform: false,
    windowsCloudSDKSettings: null,
  });

  const resultPromise = gcloud.invoke(['interactive-command']);

  mockChildProcess.stdout.emit('data', 'Standard output');
  mockChildProcess.stderr.emit('data', 'Stan');
  mockChildProcess.stdout.emit('data', 'put');
  mockChildProcess.stderr.emit('data', 'dard error');
  mockChildProcess.stdout.end();

  const result = await resultPromise;

  expect(mockedSpawn).toHaveBeenCalledWith('gcloud', ['interactive-command'], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  expect(result.code).toBe(0);
  expect(result.stdout).toContain('Standard output');
  expect(result.stderr).toContain('Standard error');
});

test('should correctly non-zero exit codes', async () => {
  const mockChildProcess = {
    stdout: new PassThrough(),
    stderr: new PassThrough(),
    stdin: new PassThrough(),
    on: vi.fn((event, callback) => {
      if (event === 'close') {
        setTimeout(() => callback(1), 0); // Error code
      }
    }),
  };
  mockedSpawn.mockReturnValue(mockChildProcess);
  mockedGetCloudSDKSettings.mockReturnValue({
    isWindowsPlatform: false,
    windowsCloudSDKSettings: null,
  });

  const resultPromise = gcloud.invoke(['interactive-command']);

  mockChildProcess.stdout.emit('data', 'Standard output');
  mockChildProcess.stderr.emit('data', 'Stan');
  mockChildProcess.stdout.emit('data', 'put');
  mockChildProcess.stderr.emit('data', 'dard error');
  mockChildProcess.stdout.end();

  const result = await resultPromise;

  expect(mockedSpawn).toHaveBeenCalledWith('gcloud', ['interactive-command'], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  expect(result.code).toBe(1);
  expect(result.stdout).toContain('Standard output');
  expect(result.stderr).toContain('Standard error');
});

test('should reject when process fails to start', async () => {
  mockedSpawn.mockReturnValue({
    stdout: new PassThrough(),
    stderr: new PassThrough(),
    stdin: new PassThrough(),
    on: vi.fn((event, callback) => {
      if (event === 'error') {
        setTimeout(() => callback(new Error('Failed to start')), 0);
      }
    }),
  });
  mockedGetCloudSDKSettings.mockReturnValue({
    isWindowsPlatform: false,
    windowsCloudSDKSettings: null,
  });

  const resultPromise = gcloud.invoke(['some-command']);

  await expect(resultPromise).rejects.toThrow('Failed to start');
  expect(mockedSpawn).toHaveBeenCalledWith('gcloud', ['some-command'], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
});

test('should correctly call lint double quotes', async () => {
  const mockChildProcess = {
    stdout: new PassThrough(),
    stderr: new PassThrough(),
    stdin: new PassThrough(),
    on: vi.fn((event, callback) => {
      if (event === 'close') {
        setTimeout(() => callback(0), 0);
      }
    }),
  };
  mockedSpawn.mockReturnValue(mockChildProcess);
  mockedGetCloudSDKSettings.mockReturnValue({
    isWindowsPlatform: false,
    windowsCloudSDKSettings: null,
  });

  const resultPromise = gcloud.lint('compute instances list --project "cloud123"');

  const json = JSON.stringify([
    {
      command_string_no_args: 'gcloud compute instances list',
      success: true,
      error_message: null,
      error_type: null,
    },
  ]);
  mockChildProcess.stdout.emit('data', json);
  mockChildProcess.stderr.emit('data', 'Update available');
  mockChildProcess.stdout.end();

  const result = await resultPromise;

  expect(mockedSpawn).toHaveBeenCalledWith(
    'gcloud',
    [
      'meta',
      'lint-gcloud-commands',
      '--command-string',
      'gcloud compute instances list --project "cloud123"',
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );

  if (!result.success) {
    assert.fail(`Expected successful response.`);
  }
  expect(result.parsedCommand).toBe('compute instances list');
});

test('should correctly call lint single quotes', async () => {
  const mockChildProcess = {
    stdout: new PassThrough(),
    stderr: new PassThrough(),
    stdin: new PassThrough(),
    on: vi.fn((event, callback) => {
      if (event === 'close') {
        setTimeout(() => callback(0), 0);
      }
    }),
  };
  mockedSpawn.mockReturnValue(mockChildProcess);
  mockedGetCloudSDKSettings.mockReturnValue({
    isWindowsPlatform: false,
    windowsCloudSDKSettings: null,
  });

  const resultPromise = gcloud.lint("compute instances list --project 'cloud123'");

  const json = JSON.stringify([
    {
      command_string_no_args: 'gcloud compute instances list',
      success: true,
      error_message: null,
      error_type: null,
    },
  ]);
  mockChildProcess.stdout.emit('data', json);
  mockChildProcess.stderr.emit('data', 'Update available');
  mockChildProcess.stdout.end();

  const result = await resultPromise;

  expect(mockedSpawn).toHaveBeenCalledWith(
    'gcloud',
    [
      'meta',
      'lint-gcloud-commands',
      '--command-string',
      "gcloud compute instances list --project 'cloud123'",
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );
  if (!result.success) {
    assert.fail(`Expected successful response.`);
  }
  expect(result.parsedCommand).toBe('compute instances list');
});
