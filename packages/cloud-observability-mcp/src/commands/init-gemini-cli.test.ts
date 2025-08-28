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

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env['INIT_CWD'];
});

test('initializeGeminiCLI should create directory and write files', async () => {
  process.env['INIT_CWD'] = '/test/cwd';
  const mockMkdir = vi.fn();
  const mockWriteFile = vi.fn();
  const mockReadFile = vi.fn().mockResolvedValue('Test content for GEMINI.md');

  await initializeGeminiCLI(undefined, {
    mkdir: mockMkdir,
    writeFile: mockWriteFile,
    readFile: mockReadFile,
  });

  const extensionDir = join('/test/cwd', '.gemini', 'extensions', 'cloud-observability-mcp');
  const extensionFile = join(extensionDir, 'gemini-extension.json');
  const geminiMdDestPath = join(extensionDir, 'GEMINI.md');

  // Verify directory creation
  expect(mockMkdir).toHaveBeenCalledWith(extensionDir, { recursive: true });

  // Verify gemini-extension.json content
  const expectedExtensionJson = {
    name: pkg.name,
    version: pkg.version,
    description: 'Enable MCP-compatible AI agents to interact with Google Cloud Observability.',
    contextFileName: 'GEMINI.md',
    mcpServers: {
      observability: {
        command: 'npx',
        args: ['-y', '@google-cloud/observability-mcp'],
      },
    },
  };
  expect(mockWriteFile).toHaveBeenCalledWith(
    extensionFile,
    JSON.stringify(expectedExtensionJson, null, 2),
  );

  // Verify GEMINI.md reading and writing
  expect(mockReadFile).toHaveBeenCalled();
  expect(mockWriteFile).toHaveBeenCalledWith(geminiMdDestPath, 'Test content for GEMINI.md');
});

test('initializeGeminiCLI should create directory and write files when process.env[init_cwd] is not set', async () => {
  const fakecwd = '/fakecwd';
  const spy = vi.spyOn(process, 'cwd');
  spy.mockReturnValue(fakecwd);

  const mockMkdir = vi.fn();
  const mockWriteFile = vi.fn();
  const mockReadFile = vi.fn().mockResolvedValue('Test content for GEMINI.md');

  await initializeGeminiCLI(undefined, {
    mkdir: mockMkdir,
    writeFile: mockWriteFile,
    readFile: mockReadFile,
  });

  const extensionDir = join(fakecwd, '.gemini', 'extensions', 'cloud-observability-mcp');
  const extensionFile = join(extensionDir, 'gemini-extension.json');
  const geminiMdDestPath = join(extensionDir, 'GEMINI.md');

  // Verify directory creation
  expect(mockMkdir).toHaveBeenCalledWith(extensionDir, { recursive: true });

  // Verify gemini-extension.json content
  const expectedExtensionJson = {
    name: pkg.name,
    version: pkg.version,
    description: 'Enable MCP-compatible AI agents to interact with Google Cloud Observability.',
    contextFileName: 'GEMINI.md',
    mcpServers: {
      observability: {
        command: 'npx',
        args: ['-y', '@google-cloud/observability-mcp'],
      },
    },
  };
  expect(mockWriteFile).toHaveBeenCalledWith(
    extensionFile,
    JSON.stringify(expectedExtensionJson, null, 2),
  );

  // Verify GEMINI.md reading and writing
  expect(mockReadFile).toHaveBeenCalled();
  expect(mockWriteFile).toHaveBeenCalledWith(geminiMdDestPath, 'Test content for GEMINI.md');
});

test('initializeGeminiCLI should log error if mkdir fails', async () => {
  const error = new Error('mkdir failed');
  const mockMkdir = vi.fn().mockRejectedValue(error);
  const mockWriteFile = vi.fn();
  const mockReadFile = vi.fn();
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  await initializeGeminiCLI(undefined, {
    mkdir: mockMkdir,
    writeFile: mockWriteFile,
    readFile: mockReadFile,
  });

  expect(consoleErrorSpy).toHaveBeenCalledWith(
    '❌ cloud-observability-mcp Gemini CLI extension initialized failed.',
    error,
  );
  expect(mockWriteFile).not.toHaveBeenCalled();

  consoleErrorSpy.mockRestore();
});

test('initializeGeminiCLI should create directory and write files with local=true', async () => {
  process.env['INIT_CWD'] = '/test/cwd';
  const mockMkdir = vi.fn();
  const mockWriteFile = vi.fn();
  const mockReadFile = vi.fn().mockResolvedValue('Test content for GEMINI.md');

  await initializeGeminiCLI(true, {
    mkdir: mockMkdir,
    writeFile: mockWriteFile,
    readFile: mockReadFile,
  });

  const extensionDir = join('/test/cwd', '.gemini', 'extensions', 'cloud-observability-mcp');
  const extensionFile = join(extensionDir, 'gemini-extension.json');
  const geminiMdDestPath = join(extensionDir, 'GEMINI.md');

  // Verify directory creation
  expect(mockMkdir).toHaveBeenCalledWith(extensionDir, { recursive: true });

  // Verify gemini-extension.json content
  const expectedExtensionJson = {
    name: pkg.name + ' [LOCAL]',
    version: pkg.version,
    description: 'Enable MCP-compatible AI agents to interact with Google Cloud Observability.',
    contextFileName: 'GEMINI.md',
    mcpServers: {
      observability: {
        command: 'npx',
        args: ['-y', 'cloud-observability-mcp'],
      },
    },
  };
  expect(mockWriteFile).toHaveBeenCalledWith(
    extensionFile,
    JSON.stringify(expectedExtensionJson, null, 2),
  );

  // Verify GEMINI.md reading and writing
  expect(mockReadFile).toHaveBeenCalled();
  expect(mockWriteFile).toHaveBeenCalledWith(geminiMdDestPath, 'Test content for GEMINI.md');
});
