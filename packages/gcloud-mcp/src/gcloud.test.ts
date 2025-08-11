import { test, expect, beforeEach, Mock, vi } from 'vitest';
import { spawn } from 'child_process';
import { PassThrough } from 'stream';
import * as gcloud from './gcloud.js';

vi.mock('child_process', () => {
  const spawn = vi.fn();
  return { spawn };
});

const mockedSpawn = spawn as unknown as Mock;

beforeEach(() => {
  vi.clearAllMocks();
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

  const resultPromise = gcloud.invoke(['interactive-command']);

  mockChildProcess.stdout.emit('data', 'Standard out');
  mockChildProcess.stderr.emit('data', 'Stan');
  mockChildProcess.stdout.emit('data', 'put');
  mockChildProcess.stderr.emit('data', 'dard error');
  mockChildProcess.stdout.end();

  const result = await resultPromise;

  expect(mockedSpawn).toHaveBeenCalledWith('gcloud', ['interactive-command'], { stdio: ['ignore', 'pipe', 'pipe'] });
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

  const resultPromise = gcloud.invoke(['interactive-command']);

  mockChildProcess.stdout.emit('data', 'Standard out');
  mockChildProcess.stderr.emit('data', 'Stan');
  mockChildProcess.stdout.emit('data', 'put');
  mockChildProcess.stderr.emit('data', 'dard error');
  mockChildProcess.stdout.end();

  const result = await resultPromise;

  expect(mockedSpawn).toHaveBeenCalledWith('gcloud', ['interactive-command'], { stdio: ['ignore', 'pipe', 'pipe'] });
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

  const resultPromise = gcloud.invoke(['some-command']);

  await expect(resultPromise).rejects.toThrow('Failed to start');
  expect(mockedSpawn).toHaveBeenCalledWith('gcloud', ['some-command'], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
});
