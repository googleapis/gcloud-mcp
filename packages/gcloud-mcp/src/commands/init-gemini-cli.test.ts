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
import { mkdir, writeFile, readFile } from 'fs/promises';
import { initializeGeminiCLI } from './init-gemini-cli.js';
import { join } from 'path';
import pkg from '../../package.json' with { type: 'json' };
import { log } from '../utility/logger.js';

vi.mock('fs/promises', () => ({
  mkdir: vi.fn(),
  writeFile: vi.fn(),
  readFile: vi.fn().mockResolvedValue('Test content for GEMINI.md'),
}));

vi.mock('../utility/logger.js', () => ({
  log: {
    error: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env['INIT_CWD'];
});

test('initializeGeminiCLI should create directory and write files', async () => {
  process.env['INIT_CWD'] = '/test/cwd';
  await initializeGeminiCLI();

  const extensionDir = join('/test/cwd', '.gemini', 'extensions', 'gcloud-mcp');
  const extensionFile = join(extensionDir, 'gemini-extension.json');
  const geminiMdDestPath = join(extensionDir, 'GEMINI.md');

  // Verify directory creation
  expect(mkdir).toHaveBeenCalledWith(extensionDir, { recursive: true });

  // Verify gemini-extension.json content
  const expectedExtensionJson = {
    name: pkg.name,
    version: pkg.version,
    description: 'Enable MCP-compatible AI agents to interact with Google Cloud.',
    contextFileName: 'GEMINI.md',
    mcpServers: {
      gcloud: {
        command: 'npx',
        args: ['-y', '@google-cloud/gcloud-mcp']
      },
    },
  };
  expect(writeFile).toHaveBeenCalledWith(extensionFile, JSON.stringify(expectedExtensionJson, null, 2));

  // Verify GEMINI.md reading and writing
  expect(readFile).toHaveBeenCalled();
  expect(writeFile).toHaveBeenCalledWith(geminiMdDestPath, 'Test content for GEMINI.md');
});

test('initializeGeminiCLI should create directory and write files when process.env[init_cwd] is not set', async () => {
  const fakecwd = '/fakecwd';
  const spy = vi.spyOn(process, 'cwd');
  spy.mockReturnValue(fakecwd);

  await initializeGeminiCLI();

  const extensionDir = join(fakecwd, '.gemini', 'extensions', 'gcloud-mcp');
  const extensionFile = join(extensionDir, 'gemini-extension.json');
  const geminiMdDestPath = join(extensionDir, 'GEMINI.md');

  // Verify directory creation
  expect(mkdir).toHaveBeenCalledWith(extensionDir, { recursive: true });

  // Verify gemini-extension.json content
  const expectedExtensionJson = {
    name: pkg.name,
    version: pkg.version,
    description: 'Enable MCP-compatible AI agents to interact with Google Cloud.',
    contextFileName: 'GEMINI.md',
    mcpServers: {
      gcloud: {
        command: 'npx',
        args: ['-y', '@google-cloud/gcloud-mcp']
      },
    },
  };
  expect(writeFile).toHaveBeenCalledWith(extensionFile, JSON.stringify(expectedExtensionJson, null, 2));

  // Verify GEMINI.md reading and writing
  expect(readFile).toHaveBeenCalled();
  expect(writeFile).toHaveBeenCalledWith(geminiMdDestPath, 'Test content for GEMINI.md');
});

test('initializeGeminiCLI should log error if mkdir fails', async () => {
  const error = new Error('mkdir failed');
  vi.mocked(mkdir).mockRejectedValue(error);

  await initializeGeminiCLI();

  expect(log.error).toHaveBeenCalledWith(
    '❌ gcloud-mcp Gemini CLI extension initialized failed.',
    error
  );
  expect(writeFile).not.toHaveBeenCalled();
});
