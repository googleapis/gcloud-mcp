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

import { test, expect, vi, beforeEach } from 'vitest';
import { initializeGeminiCLI } from './init-gemini-cli.js';
import { join } from 'path';
import pkg from '../../package.json' with { type: 'json' };
import { log } from '../utility/logger.js';
import os from 'os';

vi.mock('../utility/logger.js', () => ({
  log: {
    error: vi.fn(),
  },
}));

vi.mock('os', () => ({
  default: {
    homedir: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

const mockGeminiMdContent = '# Mock Gemini Content';

test('initializeGeminiCLI should create directory and write files', async () => {
  const homedir = '/test/home';
  vi.spyOn(os, 'homedir').mockReturnValue(homedir);
  const mockMkdir = vi.fn();
  const mockWriteFile = vi.fn();
  const mockReadFile = vi.fn().mockResolvedValue(mockGeminiMdContent);
  const mockAccess = vi.fn();

  await initializeGeminiCLI(false, 'READ_ONLY', true, {
    mkdir: mockMkdir,
    writeFile: mockWriteFile,
    readFile: mockReadFile,
    access: mockAccess,
  });

  const extensionDir = join(homedir, '.gemini', 'extensions', 'backupdr-mcp');
  const extensionFile = join(extensionDir, 'gemini-extension.json');
  const geminiMdDestPath = join(extensionDir, 'GEMINI.md');

  // Verify directory creation
  expect(mockMkdir).toHaveBeenCalledWith(extensionDir, { recursive: true });

  // Verify gemini-extension.json content
  const expectedExtensionJson = {
    name: 'backupdr-mcp',
    version: pkg.version,
    description:
      'Enable MCP-compatible AI agents to interact with Google Cloud Backup and Disaster Recovery.',
    contextFileName: 'GEMINI.md',
    mcpServers: {
      backupdr: {
        command: 'npx',
        args: ['-y', '@google-cloud/backupdr-mcp', '--access-level', 'READ_ONLY'],
      },
    },
  };
  expect(mockWriteFile).toHaveBeenCalledWith(
    extensionFile,
    JSON.stringify(expectedExtensionJson, null, 2),
  );

  // Verify GEMINI.md writing
  expect(mockWriteFile).toHaveBeenCalledWith(geminiMdDestPath, mockGeminiMdContent);
});

test('initializeGeminiCLI should NOT overwrite if overwriteContextFile is false and file exists', async () => {
  const homedir = '/test/home';
  vi.spyOn(os, 'homedir').mockReturnValue(homedir);
  const mockMkdir = vi.fn();
  const mockWriteFile = vi.fn();
  const mockReadFile = vi.fn().mockResolvedValue(mockGeminiMdContent);
  const mockAccess = vi.fn().mockResolvedValue(undefined); // File exists

  await initializeGeminiCLI(false, 'READ_ONLY', false, {
    mkdir: mockMkdir,
    writeFile: mockWriteFile,
    readFile: mockReadFile,
    access: mockAccess,
  });

  const extensionDir = join(homedir, '.gemini', 'extensions', 'backupdr-mcp');
  const geminiMdDestPath = join(extensionDir, 'GEMINI.md');

  // Verify access was called to check existence
  expect(mockAccess).toHaveBeenCalledWith(geminiMdDestPath);

  // Verify writeFile was NOT called for GEMINI.md (but was called for extension json)
  expect(mockWriteFile).toHaveBeenCalledTimes(1);
  expect(mockWriteFile).not.toHaveBeenCalledWith(geminiMdDestPath, expect.any(String));
});

test('initializeGeminiCLI should overwrite if overwriteContextFile is false but file does NOT exist', async () => {
  const homedir = '/test/home';
  vi.spyOn(os, 'homedir').mockReturnValue(homedir);
  const mockMkdir = vi.fn();
  const mockWriteFile = vi.fn();
  const mockReadFile = vi.fn().mockResolvedValue(mockGeminiMdContent);
  const mockAccess = vi.fn().mockRejectedValue(new Error('ENOENT')); // File doesn't exist

  await initializeGeminiCLI(false, 'READ_ONLY', false, {
    mkdir: mockMkdir,
    writeFile: mockWriteFile,
    readFile: mockReadFile,
    access: mockAccess,
  });

  const extensionDir = join(homedir, '.gemini', 'extensions', 'backupdr-mcp');
  const geminiMdDestPath = join(extensionDir, 'GEMINI.md');

  // Verify access was called to check existence
  expect(mockAccess).toHaveBeenCalledWith(geminiMdDestPath);

  // Verify writeFile WAS called for GEMINI.md
  expect(mockWriteFile).toHaveBeenCalledWith(geminiMdDestPath, mockGeminiMdContent);
});

test('initializeGeminiCLI should log error if mkdir fails', async () => {
  const error = new Error('mkdir failed');
  const mockMkdir = vi.fn().mockRejectedValue(error);
  const mockWriteFile = vi.fn();
  const mockReadFile = vi.fn().mockResolvedValue(mockGeminiMdContent);
  const mockAccess = vi.fn();

  await initializeGeminiCLI(undefined, 'READ_ONLY', true, {
    mkdir: mockMkdir,
    writeFile: mockWriteFile,
    readFile: mockReadFile,
    access: mockAccess,
  });

  expect(log.error).toHaveBeenCalledWith(
    '❌ backupdr-mcp Gemini CLI extension initialized failed.',
    error,
  );
  expect(mockWriteFile).not.toHaveBeenCalled();
});

test('initializeGeminiCLI should create directory and write files with local=true', async () => {
  const homedir = '/test/home';
  vi.spyOn(os, 'homedir').mockReturnValue(homedir);
  const mockMkdir = vi.fn();
  const mockWriteFile = vi.fn();
  const mockReadFile = vi.fn().mockResolvedValue(mockGeminiMdContent);
  const mockAccess = vi.fn();

  await initializeGeminiCLI(true, 'READ_ONLY', true, {
    mkdir: mockMkdir,
    writeFile: mockWriteFile,
    readFile: mockReadFile,
    access: mockAccess,
  });

  const extensionDir = join(homedir, '.gemini', 'extensions', 'backupdr-mcp');

  // Verify gemini-extension.json content
  const expectedExtensionJson = {
    name: 'backupdr-mcp-local',
    version: pkg.version,
    description:
      'Enable MCP-compatible AI agents to interact with Google Cloud Backup and Disaster Recovery.',
    contextFileName: 'GEMINI.md',
    mcpServers: {
      backupdr: {
        command: 'npx',
        args: ['-y', 'backupdr-mcp', '--access-level', 'READ_ONLY'],
      },
    },
  };
  expect(mockWriteFile).toHaveBeenCalledWith(
    join(extensionDir, 'gemini-extension.json'),
    JSON.stringify(expectedExtensionJson, null, 2),
  );
});
