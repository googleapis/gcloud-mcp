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
import { geminiMd, initializeGeminiCLI } from './init-gemini-cli.js';
import { join } from 'path';
import pkg from '../../package.json' with { type: 'json' };
import os from 'os';

vi.mock('os', () => ({
  default: {
    homedir: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

test('initializeGeminiCLI should create directory and write files', async () => {
  const homedir = '/test/home';
  vi.spyOn(os, 'homedir').mockReturnValue(homedir);
  const mockMkdir = vi.fn();
  const mockWriteFile = vi.fn();

  await initializeGeminiCLI(undefined, {
    mkdir: mockMkdir,
    writeFile: mockWriteFile,
  });

  const extensionDir = join(homedir, '.gemini', 'extensions', 'observability-mcp');
  const extensionFile = join(extensionDir, 'gemini-extension.json');
  const geminiMdDestPath = join(extensionDir, 'GEMINI.md');

  // Verify directory creation
  expect(mockMkdir).toHaveBeenCalledWith(extensionDir, { recursive: true });

  // Verify gemini-extension.json content
  const expectedExtensionJson = {
    name: 'observability-mcp',
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

  // Verify GEMINI.md writing
  expect(mockWriteFile).toHaveBeenCalledWith(geminiMdDestPath, geminiMd);
});

test('initializeGeminiCLI should log error if mkdir fails', async () => {
  const error = new Error('mkdir failed');
  const mockMkdir = vi.fn().mockRejectedValue(error);
  const mockWriteFile = vi.fn();
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  await initializeGeminiCLI(undefined, {
    mkdir: mockMkdir,
    writeFile: mockWriteFile,
  });

  expect(consoleErrorSpy).toHaveBeenCalledWith(
    '❌ observability-mcp Gemini CLI extension initialized failed.',
    error,
  );
  expect(mockWriteFile).not.toHaveBeenCalled();

  consoleErrorSpy.mockRestore();
});

test('initializeGeminiCLI should create directory and write files with local=true', async () => {
  const homedir = '/test/home';
  vi.spyOn(os, 'homedir').mockReturnValue(homedir);
  const mockMkdir = vi.fn();
  const mockWriteFile = vi.fn();

  await initializeGeminiCLI(true, {
    mkdir: mockMkdir,
    writeFile: mockWriteFile,
  });

  const extensionDir = join(homedir, '.gemini', 'extensions', 'observability-mcp');
  const extensionFile = join(extensionDir, 'gemini-extension.json');
  const geminiMdDestPath = join(extensionDir, 'GEMINI.md');

  // Verify directory creation
  expect(mockMkdir).toHaveBeenCalledWith(extensionDir, { recursive: true });

  // Verify gemini-extension.json content
  const expectedExtensionJson = {
    name: 'observability-mcp-local',
    version: pkg.version,
    description: 'Enable MCP-compatible AI agents to interact with Google Cloud Observability.',
    contextFileName: 'GEMINI.md',
    mcpServers: {
      observability: {
        command: 'npx',
        args: ['-y', 'observability-mcp'],
      },
    },
  };
  expect(mockWriteFile).toHaveBeenCalledWith(
    extensionFile,
    JSON.stringify(expectedExtensionJson, null, 2),
  );

  // Verify GEMINI.md writing
  expect(mockWriteFile).toHaveBeenCalledWith(geminiMdDestPath, geminiMd);
});
