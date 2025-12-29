import { test, expect, beforeEach, vi, assert, Mock } from 'vitest';
import {
  GcloudExecutable,
  GcloudInvocationResult,
  create,
} from './gcloud.js';
import { GcloudExecutor } from './gcloud_executor.js';

vi.mock('./gcloud_executor.js', () => {
  const GcloudExecutor = vi.fn();
  const mockedGcloudExecutor = new GcloudExecutor() as vi.Mocked<GcloudExecutor>;
  GcloudExecutor.prototype.execute = vi.fn();
  const findExecutable = vi.fn().mockResolvedValue({
    execute: mockedGcloudExecutor.execute,
  });
  return { GcloudExecutor, findExecutable, mockedGcloudExecutor };
});

let mockedGcloudExecutor: Mocked<GcloudExecutor>; // Redeclare for type safety

let gcloudExecutable: GcloudExecutable;

beforeEach(async () => {
  vi.clearAllMocks();
  vi.resetModules();
  const gcloudExecutorModule = await import('./gcloud_executor.js');
  mockedGcloudExecutor = gcloudExecutorModule.mockedGcloudExecutor;
  gcloudExecutable = await create();
});

test('should correctly handle stdout and stderr', async () => {
  const expectedResult: GcloudInvocationResult = {
    code: 0,
    stdout: 'Standard output',
    stderr: 'Standard error',
  };
  mockedGcloudExecutor.execute.mockResolvedValue(expectedResult);

  const result = await gcloudExecutable.invoke(['interactive-command']);

  expect(mockedGcloudExecutor.execute).toHaveBeenCalledWith([
    'interactive-command',
  ]);
  expect(result.code).toBe(0);
  expect(result.stdout).toContain('Standard output');
  expect(result.stderr).toContain('Standard error');
});

test('should correctly non-zero exit codes', async () => {
  const expectedResult: GcloudInvocationResult = {
    code: 1,
    stdout: 'Standard output',
    stderr: 'Standard error',
  };
  mockedGcloudExecutor.execute.mockResolvedValue(expectedResult);
  const result = await gcloudExecutable.invoke(['interactive-command']);

  expect(mockedGcloudExecutor.execute).toHaveBeenCalledWith([
    'interactive-command',
  ]);
  expect(result.code).toBe(1);
  expect(result.stdout).toContain('Standard output');
  expect(result.stderr).toContain('Standard error');
});

test('should reject when process fails to start', async () => {
  mockedGcloudExecutor.execute.mockRejectedValue(new Error('Failed to start'));
  await expect(gcloudExecutable.invoke(['some-command'])).rejects.toThrow(
    'Failed to start'
  );
  expect(mockedGcloudExecutor.execute).toHaveBeenCalledWith(['some-command']);
});

test('should correctly call lint double quotes', async () => {
  const expectedResult: GcloudInvocationResult = {
    code: 0,
    stdout: '',
    stderr: '',
  };
  const json = JSON.stringify([
    {
      command_string_no_args: 'gcloud compute instances list',
      success: true,
      error_message: null,
      error_type: null,
    },
  ]);
  expectedResult.stdout = json;
  mockedGcloudExecutor.execute.mockResolvedValue(expectedResult);

  const result = await gcloudExecutable.lint('compute instances list --project "cloud123"');

  expect(mockedGcloudExecutor.execute).toHaveBeenCalledWith([
    'meta',
    'lint-gcloud-commands',
    '--command-string',
    'gcloud compute instances list --project "cloud123"',
  ]);

  if (!result.success) {
    assert.fail('Expected successful response.');
  }
  expect(result.parsedCommand).toBe('compute instances list');
});

test('should correctly call lint single quotes', async () => {
  const expectedResult: GcloudInvocationResult = {
    code: 0,
    stdout: '',
    stderr: '',
  };
  const json = JSON.stringify([
    {
      command_string_no_args: 'gcloud compute instances list',
      success: true,
      error_message: null,
      error_type: null,
    },
  ]);
  expectedResult.stdout = json;
  mockedGcloudExecutor.execute.mockResolvedValue(expectedResult);

  const result = await gcloudExecutable.lint("compute instances list --project 'cloud123'");

  expect(mockedGcloudExecutor.execute).toHaveBeenCalledWith([
    'meta',
    'lint-gcloud-commands',
    '--command-string',
    "gcloud compute instances list --project 'cloud123'",
  ]);
  if (!result.success) {
    assert.fail('Expected successful response.');
  }
  expect(result.parsedCommand).toBe('compute instances list');
});

test('should handle non-zero exit code from lint', async () => {
  const expectedResult: GcloudInvocationResult = {
    code: 1,
    stdout: JSON.stringify([
      {
        command_string_no_args: 'gcloud invalid-command',
        success: false,
        error_message: 'lint error',
        error_type: 'Error',
      },
    ]),
    stderr: 'lint error',
  };
  mockedGcloudExecutor.execute.mockResolvedValue(expectedResult);

  const result = await gcloudExecutable.lint('invalid-command');

  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error).toBe('lint error');
  }
});

test('should handle unsuccessful lint command', async () => {
  const expectedResult: GcloudInvocationResult = {
    code: 0,
    stdout: JSON.stringify([
      {
        command_string_no_args: 'gcloud invalid-command',
        success: false,
        error_message: 'Invalid command',
        error_type: 'TestError',
      },
    ]),
    stderr: '',
  };
  mockedGcloudExecutor.execute.mockResolvedValue(expectedResult);

  const result = await gcloudExecutable.lint('invalid-command');

  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error).toBe('TestError: Invalid command');
  }
});

test('should throw error for empty lint result', async () => {
  const expectedResult: GcloudInvocationResult = {
    code: 0,
    stdout: '[]',
    stderr: '',
  };
  mockedGcloudExecutor.execute.mockResolvedValue(expectedResult);

  await expect(gcloudExecutable.lint('some-command')).rejects.toThrow(
    'gcloud lint result contained no contents'
  );
});